"""
Gera os dados da apresentação da etapa 3 (site machine-learning, rota /projetos/consumo-data-center).

Repete o pipeline do notebook sarimax_data_center.ipynb com a mesma configuração e salva
os números, curvas e previsões usados nos gráficos.

Uso:
    python gerar_dados_apresentacao.py [leituras.csv ou pasta com os CSVs] [--provisorio]

Escreve em ../src/projects/data-center/data.json e, ao lado, model.json
(os coeficientes e a previsão-base, usados na seção "Teste o modelo").
No Google Colab (ou em qualquer lugar sem a pasta do site), escreve os dois arquivos na pasta atual:
baixe-os e copie para src/projects/data-center/.
Requer pandas e statsmodels. Leva alguns minutos: são cerca de 20 ajustes do SARIMAX.
Os CSVs são baixados do Kaggle se não forem informados nem estiverem nesta pasta.

SARIMAX_RAPIDO=1 e SARIMAX_JANELAS=2 (variáveis de ambiente) encurtam a execução para testes; não use para apresentar.

--provisorio marca os números como de teste (a página mostra um aviso). Use só com dados que
NÃO sejam os do Kaggle, por exemplo os de gerar_dados_de_teste.py.
"""
import os
for _v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_v, "1")   # um ajuste por núcleo, sem disputar as threads do BLAS
import glob, io, itertools, json, multiprocessing as mp, sys, time, urllib.request, warnings, zipfile
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.tsa.seasonal import STL
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.stattools import acf, adfuller, kpss, pacf

AQUI = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else os.getcwd()
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
PROVISORIO = "--provisorio" in sys.argv
DESTINO = os.path.join(AQUI, "..", "src", "projects", "data-center")
if not os.path.isdir(os.path.join(AQUI, "..", "src", "projects")):
    DESTINO = os.getcwd()   # Colab: salva ao lado do notebook

# mesma configuração do notebook (seção 2): se mudar lá, mude aqui
DC = "DC-03"                       # o híbrido com free cooling: onde a temperatura mais pesa
TARGET = "cooling_power_kw"        # o que a refrigeração gasta
EXOG = ["ambient_temperature_c", "it_power_kw"]   # clima e a potência dos servidores (a "carga")
FAIXA_CARGA = (90, 120)            # kW de TI: faixa usada para comparar os data centers com carga parecida
FREQ = "60min"
PERIOD = 24
TEST_HOURS = 24 * 7
FAST = os.environ.get("SARIMAX_RAPIDO") == "1"          # só para testar: grade pequena
MASK_FLAGGED = False
ROLLING_WINDOWS = int(os.environ.get("SARIMAX_JANELAS", "4"))
if FAST:
    ORDERS = [(1, 0, 1), (1, 1, 1)]
    SEASONALS = [(0, 1, 1, PERIOD)]
else:
    ORDERS = [(1, 0, 1), (2, 0, 1), (1, 1, 1), (2, 1, 1), (2, 0, 2)]
    SEASONALS = [(0, 1, 1, PERIOD), (1, 1, 1, PERIOD)]

# ---------------------------------------------------------------------------
# Carga dos CSVs
# ---------------------------------------------------------------------------
NECESSARIAS = {"timestamp", "total_facility_power_kw", "data_center_id"}


def achar_csvs(pasta):
    achados = {}
    for f in sorted(glob.glob(os.path.join(pasta, "**", "*.csv"), recursive=True)):
        try:
            cab = pd.read_csv(f, nrows=2)
        except Exception:
            continue
        if NECESSARIAS <= set(cab.columns):
            achados["leituras"] = f
        elif "cooling_architecture" in cab.columns:
            achados["cadastro"] = f
    return achados


achados = {}
if ARGS and ARGS[0].endswith(".csv") and os.path.exists(ARGS[0]):
    achados["leituras"] = ARGS[0]
    achados.update({k: v for k, v in achar_csvs(os.path.dirname(os.path.abspath(ARGS[0]))).items() if k == "cadastro"})
else:
    achados = achar_csvs(ARGS[0] if ARGS and os.path.isdir(ARGS[0]) else AQUI)
if "leituras" not in achados:
    pasta_zip = os.path.join(AQUI, "dados_kaggle")
    url = "https://www.kaggle.com/api/v1/datasets/download/eishatuzzuhra/ai-data-center-energy-efficiency-dataset-2026"
    with urllib.request.urlopen(url) as resp:
        zipfile.ZipFile(io.BytesIO(resp.read())).extractall(pasta_zip)
    achados = achar_csvs(pasta_zip)
if "leituras" not in achados:
    raise SystemExit("Não achei o CSV de leituras (com timestamp, data_center_id e total_facility_power_kw).")
df = pd.read_csv(achados["leituras"])

# cadastro dos data centers (o arquivo do Kaggle com cooling_architecture); se faltar, usa os valores conhecidos
CADASTRO_PADRAO = pd.DataFrame([
    ("DC-01", "air-cooled, chilled-water CRAH", "cool-temperate continental (synthetic ambient profile)", -5, 16, 2.3, 10.2, 24),
    ("DC-02", "direct-to-chip liquid cooling with air-side assist", "mild maritime (synthetic ambient profile)", -8, 15, 2.4, 10.2, 25),
    ("DC-03", "hybrid air cooling with economizer (free cooling)", "warm arid, mild winters (synthetic ambient profile)", -7, 14, 2.2, 9.8, 25),
], columns=["data_center_id", "cooling_architecture", "climate_profile", "utc_offset_hours", "installed_servers",
            "server_idle_kw", "server_max_kw", "inlet_setpoint_c"])
cadastro = pd.read_csv(achados["cadastro"]) if "cadastro" in achados else CADASTRO_PADRAO

r4 = lambda v: round(float(v), 4)
r2 = lambda v: round(float(v), 2)
lista = lambda s, d=2: [round(float(v), d) for v in s]
iso = lambda t: pd.Timestamp(t).strftime("%Y-%m-%dT%H:%M:%S")
t_ini = time.time()


def log(msg):
    print(f"[{time.time() - t_ini:6.0f}s] {msg}", flush=True)


# ---------------------------------------------------------------------------
# Tratamento (seção 3 do notebook)
# ---------------------------------------------------------------------------
def prepare(dc, freq=FREQ, mask_flagged=MASK_FLAGGED):
    d = df[df["data_center_id"] == dc].copy()
    d["timestamp"] = pd.to_datetime(d["timestamp"], utc=True).dt.tz_localize(None)
    d = d.sort_values("timestamp")
    n_dup = int(d.duplicated("timestamp").sum())
    d = d.drop_duplicates("timestamp", keep="first").set_index("timestamp")
    cols = [TARGET] + EXOG
    flags = d["data_quality_flag"].copy()
    d = d[cols].apply(pd.to_numeric, errors="coerce")
    if mask_flagged:
        d.loc[flags.ne("ok")] = np.nan
    step = d.index.to_series().diff().mode().iloc[0]
    full_idx = pd.date_range(d.index.min(), d.index.max(), freq=step)
    n_gap = len(full_idx) - len(d)
    d = d.reindex(full_idx)
    nan_cols = {c: int(d[c].isna().sum()) for c in cols}
    d = d.interpolate(method="time", limit_direction="both")
    h = d.resample(freq).mean()
    info = {"rows": int(len(flags)), "step_min": int(step.total_seconds() // 60), "duplicates": n_dup, "gaps": int(n_gap),
            "nan_cells": int(sum(nan_cols.values())), "nan_by_col": nan_cols,
            "flags": {str(k): int(v) for k, v in flags.fillna("(vazio)").value_counts().items()}, "hours": int(len(h))}
    return h, info


def metrics(y_true, y_pred):
    e = np.asarray(y_true) - np.asarray(y_pred)
    return {"mae": r4(np.mean(np.abs(e))), "rmse": r4(np.sqrt(np.mean(e ** 2))),
            "mape": r4(np.mean(np.abs(e / np.asarray(y_true))) * 100)}


def split_scale(y, X, test_hours=TEST_HOURS, end=None):
    end = len(y) if end is None else end
    y_tr, y_te = y.iloc[:end - test_hours], y.iloc[end - test_hours:end]
    X_tr, X_te = X.iloc[:end - test_hours], X.iloc[end - test_hours:end]
    keep = X_tr.columns[X_tr.std() > 0]
    X_tr, X_te = X_tr[keep], X_te[keep]
    mu, sd = X_tr.mean(), X_tr.std()
    return y_tr, y_te, (X_tr - mu) / sd, (X_te - mu) / sd, mu, sd


def fit_sarimax(y_tr, X_tr, order, seasonal):
    return SARIMAX(y_tr, exog=X_tr, order=order, seasonal_order=seasonal,
                   enforce_stationarity=False, enforce_invertibility=False).fit(disp=False, maxiter=200)


def prever(res, passos, X_te=None):
    return pd.Series(res.get_forecast(steps=passos, exog=X_te).predicted_mean.values)


def perfil_medio(y_tr, indice):
    perfil = y_tr.groupby(y_tr.index.hour).mean()
    return pd.Series(perfil.reindex(indice.hour).values, index=indice)


def executar(funcao, trabalhos):
    """Roda os ajustes em paralelo (um por núcleo). Sem fork (Windows), roda um de cada vez.

    Cada resultado é guardado em .cache_sarimax/; se o script for interrompido, ao rodar de novo ele continua de onde parou.
    """
    import hashlib, pickle
    pasta = Path(__file__).resolve().parent / ".cache_sarimax"
    pasta.mkdir(exist_ok=True)
    arqs = [pasta / (funcao.__name__ + "_" + hashlib.sha1(pickle.dumps(t)).hexdigest()[:16] + ".pkl") for t in trabalhos]
    saida = [pickle.load(open(a, "rb")) if a.exists() else None for a in arqs]
    faltam = [i for i, a in enumerate(arqs) if not a.exists()]

    def guardar(i, r):
        saida[i] = r
        pickle.dump(r, open(arqs[i], "wb"))

    try:
        contexto = mp.get_context("fork")
    except ValueError:
        for i in faltam:
            guardar(i, funcao(trabalhos[i]))
        return saida
    if faltam:
        with ProcessPoolExecutor(max_workers=min(4, os.cpu_count() or 1), mp_context=contexto) as pool:
            futuros = {pool.submit(funcao, trabalhos[i]): i for i in faltam}
            for f in as_completed(futuros):
                guardar(futuros[f], f.result())
    return saida


def job_grade(a):
    o, s, y_tr, Xs_tr = a
    t0 = time.time()
    try:
        m = fit_sarimax(y_tr, Xs_tr, o, s)
        return {"order": list(o), "seasonal": list(s), "aic": r2(m.aic), "bic": r2(m.bic), "seconds": round(time.time() - t0, 1)}
    except Exception as e:
        return {"erro": f"{o} {s}: {e}"}


def job_ablacao(a):
    nome, cols, ordem, sazonal, y_tr, Xs_tr, Xs_te, y_te = a
    m = fit_sarimax(y_tr, Xs_tr[cols], ordem, sazonal)
    p = prever(m, len(y_te), Xs_te[cols]).values
    return {"label": nome, "exog": cols, **metrics(y_te, p)}


def job_janela(a):
    y, X, fim, ordem, sazonal = a
    ytr, yte, xa, xb, _, _ = split_scale(y, X, end=fim)
    m = fit_sarimax(ytr, xa, ordem, sazonal)
    pw = prever(m, len(yte), xb).values
    return {"start": iso(yte.index[0]), "end": iso(yte.index[-1]), "train_h": int(len(ytr)),
            "sarimax": metrics(yte, pw), "profile": metrics(yte, perfil_medio(ytr, yte.index))}


def job_centro(a):
    k, ordem, sazonal, _alvo, _exog = a      # alvo e exógenas entram só na chave do cache
    hk, _ = prepare(k)
    ytr, yte, xa, xb, _, sk = split_scale(hk[TARGET], hk[EXOG])
    m = fit_sarimax(ytr, xa, ordem, sazonal)
    pk = prever(m, len(yte), xb).values
    return {"id": k, "mean_kw": r2(hk[TARGET].mean()), **metrics(yte, pk), "profile_mae": metrics(yte, perfil_medio(ytr, yte.index))["mae"],
            "per_unit": {n: r4(m.params[n] / sk[n]) for n in xa.columns}, "hours": int(len(hk))}


h, qual = prepare(DC)
y, X = h[TARGET], h[EXOG]
out = {"source": {"file": os.path.basename(achados["leituras"]), "placeholder": bool(PROVISORIO)}, "dc": DC, "target": TARGET}
out["config"] = {"freq": FREQ, "period": PERIOD, "test_hours": TEST_HOURS, "fast": FAST, "mask_flagged": MASK_FLAGGED,
                 "rolling_windows": ROLLING_WINDOWS}
log(f"{DC}: {len(y)} horas depois do tratamento")

# ---------------------------------------------------------------------------
# Dataset, colunas e qualidade
# ---------------------------------------------------------------------------
ids = sorted(df["data_center_id"].unique())
tempos = pd.to_datetime(df["timestamp"], utc=True)
out["dataset"] = {"rows": int(len(df)), "columns": int(df.shape[1]), "per_dc": {k: int(v) for k, v in df.groupby("data_center_id").size().items()},
                  "start": iso(tempos.min().tz_localize(None)), "end": iso(tempos.max().tz_localize(None)),
                  "step_min": qual["step_min"], "origins": sorted(map(str, df["data_origin"].dropna().unique())),
                  "workloads": {str(k): int(v) for k, v in df["workload_type"].value_counts().items()}}
DESC = {
    "reading_id": ("identificador da leitura", "id"), "timestamp": ("data e hora (UTC)", "time"),
    "data_center_id": ("qual data center", "group"), "workload_type": ("tipo de carga de trabalho", "unused"),
    "active_servers": ("servidores ativos", "covered"), "cpu_utilization_percent": ("utilização de CPU (%)", "covered"),
    "gpu_utilization_percent": ("utilização de GPU (%)", "covered"), "memory_usage_percent": ("uso de memória (%)", "unused"),
    "network_utilization_percent": ("utilização da rede (%)", "unused"), "ambient_temperature_c": ("temperatura ambiente (°C)", "exog"),
    "inlet_temperature_c": ("temperatura de entrada do ar (°C)", "effect"), "it_power_kw": ("potência dos servidores, a carga (kW)", "exog"),
    "cooling_power_kw": ("potência da refrigeração (kW)", "target"), "total_facility_power_kw": ("potência total do data center (kW)", "leak"),
    "pue": ("PUE = total ÷ TI", "leak"), "facility_energy_kwh": ("energia no intervalo (kWh)", "leak"),
    "data_quality_flag": ("sinalização de qualidade", "meta"), "data_origin": ("origem do dado", "meta")}
out["columns"] = [{"name": c, "desc": DESC.get(c, (c, "unused"))[0], "role": DESC.get(c, (c, "unused"))[1],
                   "kind": "cat" if df[c].dtype == object else "num"} for c in df.columns]
out["quality"] = {**qual, "dc": DC}
cad = cadastro.set_index("data_center_id")
out["centers"] = [{"id": k, "architecture": str(cad.loc[k, "cooling_architecture"]), "climate": str(cad.loc[k, "climate_profile"]),
                   "utc_offset": int(cad.loc[k, "utc_offset_hours"]), "servers": int(cad.loc[k, "installed_servers"]),
                   "idle_kw": float(cad.loc[k, "server_idle_kw"]), "max_kw": float(cad.loc[k, "server_max_kw"]),
                   "setpoint_c": float(cad.loc[k, "inlet_setpoint_c"]), "rows": out["dataset"]["per_dc"].get(k, 0)}
                  for k in ids if k in cad.index]

# ---------------------------------------------------------------------------
# Exploração (seção 4)
# ---------------------------------------------------------------------------
out["series"] = {"start": iso(y.index[0]), "step_h": 1, "target": lista(y), **{c: lista(X[c]) for c in EXOG}}
hora = y.groupby(y.index.hour)
out["profile"] = {"hour_mean": lista(hora.mean()), "hour_std": lista(hora.std()),
                  "weekday_mean": lista(y.groupby(y.index.dayofweek).mean()),
                  "ambient_hour_mean": lista(X["ambient_temperature_c"].groupby(X.index.hour).mean())}
corr = h.corr()[TARGET].drop(TARGET)
out["corr"] = [{"name": k, "r": round(float(v), 3)} for k, v in corr.dropna().sort_values(key=abs, ascending=False).items()]
stl = STL(y, period=PERIOD, robust=True).fit()
out["stl"] = {"trend": lista(stl.trend), "seasonal": lista(stl.seasonal), "resid": lista(stl.resid),
              "strength_seasonal": r4(max(0, 1 - stl.resid.var() / (stl.resid + stl.seasonal).var())),
              "strength_trend": r4(max(0, 1 - stl.resid.var() / (stl.resid + stl.trend).var()))}

# ---------------------------------------------------------------------------
# Estacionariedade, ACF e PACF (seção 5)
# ---------------------------------------------------------------------------
def estacionariedade(s, label):
    s = s.dropna()
    a = float(adfuller(s, autolag="AIC")[1])
    k = float(kpss(s, regression="c", nlags="auto")[1])
    return {"label": label, "adf_p": round(a, 4), "kpss_p": round(k, 4), "adf_ok": a < 0.05, "kpss_ok": k > 0.05}


out["stationarity"] = [estacionariedade(y, "original"), estacionariedade(y.diff(), "d = 1"),
                       estacionariedade(y.diff(PERIOD), f"D = 1 (lag {PERIOD})"), estacionariedade(y.diff(PERIOD).diff(), "D = 1 e d = 1")]
z = y.diff(PERIOD).dropna()
out["acf"] = {"lags": 72, "acf": lista(acf(z, nlags=72, fft=True)[1:], 3), "pacf": lista(pacf(z, nlags=72, method="ywm")[1:], 3),
              "ci": r4(1.96 / np.sqrt(len(z)))}

# ---------------------------------------------------------------------------
# Treino, teste e referências (seção 6)
# ---------------------------------------------------------------------------
y_tr, y_te, Xs_tr, Xs_te, mu, sd = split_scale(y, X)
usadas = list(Xs_tr.columns)
out["split"] = {"train_h": int(len(y_tr)), "test_h": int(len(y_te)), "train_start": iso(y_tr.index[0]), "train_end": iso(y_tr.index[-1]),
                "test_start": iso(y_te.index[0]), "test_end": iso(y_te.index[-1]), "exog": usadas,
                "exog_dropped": [c for c in EXOG if c not in usadas],
                "exog_mean": {c: r4(mu[c]) for c in usadas}, "exog_std": {c: r4(sd[c]) for c in usadas},
                "train_mean": r4(y_tr.mean()), "train_std": r4(y_tr.std()), "test_mean": r4(y_te.mean()), "test_std": r4(y_te.std())}
pred_naive = pd.Series(np.tile(y_tr.iloc[-PERIOD:].values, TEST_HOURS // PERIOD + 1)[:TEST_HOURS], index=y_te.index)
pred_perfil = perfil_medio(y_tr, y_te.index)

# ---------------------------------------------------------------------------
# Escolha dos parâmetros (seção 7)
# ---------------------------------------------------------------------------
resultados = executar(job_grade, [(o, s, y_tr, Xs_tr) for o, s in itertools.product(ORDERS, SEASONALS)])
for r in resultados:
    log(r["erro"] + " falhou" if "erro" in r else f"grade {tuple(r['order'])} {tuple(r['seasonal'])}: AIC {r['aic']}")
linhas = sorted((r for r in resultados if "erro" not in r), key=lambda r: r["aic"])
ORDEM, SAZONAL = tuple(linhas[0]["order"]), tuple(linhas[0]["seasonal"])
out["grid"] = {"rows": linhas, "best": {"order": list(ORDEM), "seasonal": list(SAZONAL), "aic": linhas[0]["aic"], "bic": linhas[0]["bic"]}}

# ---------------------------------------------------------------------------
# Modelo final e diagnóstico (seção 8)
# ---------------------------------------------------------------------------
res = fit_sarimax(y_tr, Xs_tr, ORDEM, SAZONAL)
ci_par = res.conf_int()
coef = []
for n in usadas:
    por_unidade = float(res.params[n] / sd[n])
    coef.append({"name": n, "coef_std": r4(res.params[n]), "std_err": r4(res.bse[n]), "p": round(float(res.pvalues[n]), 4),
                 "low": r4(ci_par.loc[n, 0]), "high": r4(ci_par.loc[n, 1]), "sd": r4(sd[n]), "per_unit": r4(por_unidade)})
dinamica = [{"name": n, "coef": r4(res.params[n]), "p": round(float(res.pvalues[n]), 4)} for n in res.params.index if n not in usadas and n != "sigma2"]
out["model"] = {"order": list(ORDEM), "seasonal": list(SAZONAL), "aic": r2(res.aic), "bic": r2(res.bic), "sigma2": r4(res.params["sigma2"]),
                "coef": coef, "dynamics": dinamica}
resid = res.resid.iloc[PERIOD + 1:]
lb = acorr_ljungbox(resid, lags=[24, 48], return_df=True)
borda = np.linspace(-4 * resid.std(), 4 * resid.std(), 21)
out["diagnostics"] = {"ljung": [{"lag": int(l), "stat": r4(r.lb_stat), "p": r4(r.lb_pvalue)} for l, r in lb.iterrows()],
                      "resid_acf": lista(acf(resid, nlags=48, fft=True)[1:], 3), "ci": r4(1.96 / np.sqrt(len(resid))),
                      "resid_mean": r4(resid.mean()), "resid_std": r4(resid.std()),
                      "hist": {"bins": lista(borda, 2), "counts": np.histogram(np.clip(resid, borda[0] + 1e-9, borda[-1] - 1e-9), bins=borda)[0].tolist()}}
log("modelo final ajustado")

# ---------------------------------------------------------------------------
# Previsão no teste (seção 9)
# ---------------------------------------------------------------------------
fc = res.get_forecast(steps=len(y_te), exog=Xs_te)
pred = pd.Series(fc.predicted_mean.values, index=y_te.index)
ic = fc.conf_int(alpha=0.05)
lo, hi = ic.iloc[:, 0].values, ic.iloc[:, 1].values
res0 = fit_sarimax(y_tr, None, ORDEM, SAZONAL)
pred_sarima = pd.Series(prever(res0, len(y_te)).values, index=y_te.index)
err = pred - y_te
out["forecast"] = {"start": iso(y_te.index[0]), "hours": int(len(y_te)), "real": lista(y_te), "pred": lista(pred), "lo": lista(lo), "hi": lista(hi),
                   "sarima": lista(pred_sarima), "naive": lista(pred_naive), "profile": lista(pred_perfil)}
out["metrics"] = {"sarimax": metrics(y_te, pred), "sarima": metrics(y_te, pred_sarima), "naive": metrics(y_te, pred_naive),
                  "profile": metrics(y_te, pred_perfil), "within_ci": r4(np.mean((y_te.values >= lo) & (y_te.values <= hi))),
                  "within_5pct": r4(np.mean(np.abs(err / y_te) <= 0.05)), "bias": r4(err.mean())}
por_hora = lambda e: [r4(v) for v in e.abs().groupby(e.index.hour).mean()]
out["err_by_hour"] = {"sarimax": por_hora(err), "profile": por_hora(pred_perfil - y_te)}

# ---------------------------------------------------------------------------
# Efeito das variáveis externas (seção 10)
# ---------------------------------------------------------------------------
GRUPOS = [("Só o passado (SARIMA)", []), ("+ clima", ["ambient_temperature_c"]),
          ("+ carga", ["it_power_kw"]), ("Todas as externas", usadas)]
novos = [(nome, [c for c in cols if c in usadas]) for nome, cols in GRUPOS[1:-1]]
novos = [(n, c) for n, c in novos if c]
feitos = {r["label"]: r for r in executar(job_ablacao, [(n, c, ORDEM, SAZONAL, y_tr, Xs_tr, Xs_te, y_te) for n, c in novos])}
out["ablation"] = [{"label": GRUPOS[0][0], "exog": [], **metrics(y_te, pred_sarima)}] + list(feitos.values()) + \
                  [{"label": GRUPOS[-1][0], "exog": usadas, **metrics(y_te, pred)}]
log("ablação pronta")

# ---------------------------------------------------------------------------
# Validação em várias janelas (seção 11)
# ---------------------------------------------------------------------------
fins = [len(y) - (ROLLING_WINDOWS - 1 - w) * TEST_HOURS for w in range(ROLLING_WINDOWS)]
roll = executar(job_janela, [(y, X, f, ORDEM, SAZONAL) for f in fins if f - TEST_HOURS >= 24 * 28])
for i, r in enumerate(roll):
    log(f"janela {i + 1}/{len(roll)}: MAE {r['sarimax']['mae']}")
out["rolling"] = roll

# ---------------------------------------------------------------------------
# Os três data centers (seção 12)
# ---------------------------------------------------------------------------
centros = executar(job_centro, [(k, ORDEM, SAZONAL, TARGET, tuple(EXOG)) for k in ids])
log("três data centers prontos")
out["centers_results"] = centros


# ---------------------------------------------------------------------------
# Comparação da refrigeração nos três data centers (descritiva, sem modelo)
# ---------------------------------------------------------------------------
dd = df.copy()
dd["t"] = pd.to_datetime(dd["timestamp"], utc=True)
for c in ("it_power_kw", "cooling_power_kw", "ambient_temperature_c", "pue"):
    dd[c] = pd.to_numeric(dd[c], errors="coerce")
dd = dd.dropna(subset=["it_power_kw", "cooling_power_kw", "ambient_temperature_c", "pue"])
dd["over"] = dd["cooling_power_kw"] / dd["it_power_kw"]
FAIXAS = [-30, 5, 10, 15, 20, 25, 60]
ROTULOS = ["até 5 °C", "5 a 10 °C", "10 a 15 °C", "15 a 20 °C", "20 a 25 °C", "acima de 25 °C"]
MIN_N = 30      # faixa com menos leituras que isso não é mostrada


def r2_ajuste(yv, Xm):
    b = np.linalg.lstsq(Xm, yv, rcond=None)[0]
    return b, float(1 - ((yv - Xm @ b) ** 2).sum() / ((yv - yv.mean()) ** 2).sum())


frio = {"edges": ROTULOS, "load_range": list(FAIXA_CARGA), "min_n": MIN_N, "cooling": {}, "n": {}}
por_dc = []
horas_dc = {}
for k, g in dd.groupby("data_center_id"):
    yv, itv, tv = g["cooling_power_kw"].values, g["it_power_kw"].values, g["ambient_temperature_c"].values
    _, a_carga = r2_ajuste(yv, np.c_[np.ones(len(g)), itv])
    b_ct, a_ct = r2_ajuste(yv, np.c_[np.ones(len(g)), itv, tv])
    por_dc.append({"id": k, "pue_mean": r4(g["pue"].mean()), "pue_std": r4(g["pue"].std()), "overhead": r4(g["over"].mean()),
                   "cooling_mean": r2(g["cooling_power_kw"].mean()), "it_mean": r2(g["it_power_kw"].mean()),
                   "temp_mean": r2(g["ambient_temperature_c"].mean()), "temp_p5": r2(g["ambient_temperature_c"].quantile(0.05)),
                   "temp_p95": r2(g["ambient_temperature_c"].quantile(0.95)), "r2_load": r4(a_carga), "r2_load_temp": r4(a_ct),
                   "kw_per_c": r4(b_ct[2])})
    horas_dc[k] = [r4(v) for v in g.groupby(g["t"].dt.hour)["over"].mean()]
    m = g[(g["it_power_kw"] > FAIXA_CARGA[0]) & (g["it_power_kw"] <= FAIXA_CARGA[1])]
    faixa = pd.cut(m["ambient_temperature_c"], FAIXAS, labels=ROTULOS)
    medias = m.groupby(faixa, observed=False)["cooling_power_kw"].mean()
    ns = m.groupby(faixa, observed=False)["cooling_power_kw"].size()
    frio["cooling"][k] = [None if ns[l] < MIN_N or pd.isna(medias[l]) else r2(medias[l]) for l in ROTULOS]
    frio["n"][k] = [int(ns[l]) for l in ROTULOS]
out["cooling"] = {"per_dc": por_dc, "by_temp": frio, "overhead_by_hour": horas_dc}
log("comparação da refrigeração pronta")

# ---------------------------------------------------------------------------
# Escrita
# ---------------------------------------------------------------------------
os.makedirs(DESTINO, exist_ok=True)
SAIDA = os.path.join(DESTINO, "data.json")
json.dump(out, open(SAIDA, "w"), ensure_ascii=False, allow_nan=False, separators=(",", ":"))

# ---------------------------------------------------------------------------
# Modelo exportado: o site refaz a previsão de cenários no navegador.
# Os coeficientes das externas são lineares: mudar uma variável nos 7 dias de teste desloca a previsão
# em (coeficiente × mudança), porque o resto do modelo só depende do passado até o fim do treino.
# `parity` guarda previsões refeitas pelo statsmodels para o teste automático conferir essa conta.
# ---------------------------------------------------------------------------
INFO = {"ambient_temperature_c": ("temperatura ambiente", "°C", -10, 10, 0.5), "it_power_kw": ("potência dos servidores (carga)", "kW", -30, 30, 1)}
exog_info = [{"name": c["name"], "label": INFO[c["name"]][0], "unit": INFO[c["name"]][1], "min": INFO[c["name"]][2], "max": INFO[c["name"]][3],
              "step": INFO[c["name"]][4], "per_unit": c["per_unit"], "test_mean": r4(X.loc[y_te.index, c["name"]].mean())} for c in coef]
cenarios = [{n: 5.0 if n == "ambient_temperature_c" else 0.0 for n in usadas},
            {n: 10.0 if n == "it_power_kw" else 0.0 for n in usadas},
            {n: (-10.0 if n == "it_power_kw" else 3.0 if n == "ambient_temperature_c" else 0.0) for n in usadas},
            {n: INFO[n][3] / 2 for n in usadas}]
parity = []
for dlt in cenarios:
    Xm = Xs_te.copy()
    for n, v in dlt.items():
        Xm[n] = Xm[n] + v / sd[n]
    pm = prever(res, len(y_te), Xm).values
    parity.append({"delta": {n: float(v) for n, v in dlt.items()}, "first": [round(float(v), 4) for v in pm[:6]],
                   "sum": round(float(pm.sum()), 3)})
modelo = {"dc": DC, "start": iso(y_te.index[0]), "hours": int(len(y_te)), "exog": exog_info,
          "base": {"real": lista(y_te, 3), "pred": lista(pred, 4), "lo": lista(lo, 4), "hi": lista(hi, 4)},
          "parity": parity}
SAIDA_MODELO = os.path.join(DESTINO, "model.json")
json.dump(modelo, open(SAIDA_MODELO, "w"), ensure_ascii=False, allow_nan=False, separators=(",", ":"))
print("modelo salvo em", os.path.normpath(SAIDA_MODELO))
print("dados salvos em", os.path.normpath(SAIDA))
print(json.dumps({k: out[k] for k in ("metrics", "grid", "stationarity")}, ensure_ascii=False, indent=1)[:2500])
if PROVISORIO:
    print("\nATENÇÃO: números provisórios (--provisorio). Rode de novo com os CSVs do Kaggle antes de apresentar.")
