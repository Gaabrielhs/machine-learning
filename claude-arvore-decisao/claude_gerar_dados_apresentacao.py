"""
Gera os dados da apresentação da etapa 2 (site machine-learning, rota /projetos/claude-arvore-de-decisao).

Repete o pipeline do notebook claude_arvore_decisao.ipynb com a mesma configuração e salva
os números, curvas e amostras usados nos gráficos.

Uso:
    python claude_gerar_dados_apresentacao.py [caminho/para/o/csv]

Escreve em ../src/projects/claude-arvore-decisao/data.json e, ao lado, model.json
(a árvore treinada, usada na seção "Teste o modelo").
No Google Colab (ou em qualquer lugar sem a pasta do site), escreve os dois arquivos na pasta atual:
baixe-os e copie para src/projects/claude-arvore-decisao/.
Requer pandas e scikit-learn.
O CSV é baixado do Kaggle se não for informado nem estiver nesta pasta.
"""
import io, json, os, sys, urllib.request, warnings, zipfile
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeRegressor

AQUI = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else os.getcwd()
ARQUIVO = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].endswith(".csv") else os.path.join(AQUI, "bedtime_screentime_sleep_debt.csv")
DESTINO = os.path.join(AQUI, "..", "src", "projects", "claude-arvore-decisao")
if not os.path.isdir(os.path.join(AQUI, "..", "src", "projects")):
    DESTINO = os.getcwd()   # Colab: salva ao lado do notebook
if not os.path.exists(ARQUIVO):
    url = "https://www.kaggle.com/api/v1/datasets/download/samartalwar/sleep-debt-and-screen-time-late-night-phone-habits"
    with urllib.request.urlopen(url) as resp:
        zipfile.ZipFile(io.BytesIO(resp.read())).extract("bedtime_screentime_sleep_debt.csv", AQUI)
df = pd.read_csv(ARQUIVO)

# mesma configuração do notebook (seção 1)
SEED, TEST_SIZE, FOLDS = 42, 0.20, 5
ALVO = "total_sleep_hours"
IDENTIFICADOR = ["user_id"]
DERIVADA_DO_ALVO = ["sleep_debt_category"]
MEDIDAS_DA_NOITE = ["sleep_latency_min", "deep_sleep_pct", "rem_sleep_pct"]
CONSEQUENCIAS = ["next_day_fatigue_score", "morning_alarm_snoozes"]
COLUNAS_REMOVIDAS = IDENTIFICADOR + DERIVADA_DO_ALVO + MEDIDAS_DA_NOITE + CONSEQUENCIAS
PROFUNDIDADES = list(range(1, 16)) + [None]
MIN_POR_FOLHA = [1, 5, 10, 20, 50, 100]
y = df[ALVO].to_numpy()


def pipeline(remover):
    X = df.drop(columns=remover + [ALVO])
    cat = X.select_dtypes(include="object").columns.tolist()
    num = X.select_dtypes(exclude="object").columns.tolist()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=TEST_SIZE, random_state=SEED)
    pre = ColumnTransformer([("num", "passthrough", num), ("cat", OneHotEncoder(handle_unknown="ignore"), cat)],
                            sparse_threshold=0, verbose_feature_names_out=False)
    A, B = pre.fit_transform(Xtr), pre.transform(Xte)
    busca = GridSearchCV(DecisionTreeRegressor(criterion="squared_error", random_state=SEED),
                         {"max_depth": PROFUNDIDADES, "min_samples_leaf": MIN_POR_FOLHA},
                         cv=FOLDS, scoring="r2", return_train_score=True).fit(A, ytr)
    arvore = DecisionTreeRegressor(criterion="squared_error", random_state=SEED, **busca.best_params_).fit(A, ytr)
    return dict(X=X, cat=cat, num=num, Xtr=Xtr, Xte=Xte, ytr=ytr, yte=yte, pre=pre, A=A, B=B, busca=busca, m=arvore)


R = pipeline(COLUNAS_REMOVIDAS)
m, pre, busca = R["m"], R["pre"], R["busca"]
pred, pred_tr = m.predict(R["B"]), m.predict(R["A"])
features = list(pre.get_feature_names_out())
r4 = lambda v: round(float(v), 4)
out = {"shape": list(df.shape)}

desc = {
    "user_id": "identificador do participante", "age": "idade (anos)", "gender": "gênero", "occupation_type": "tipo de ocupação",
    "chronotype": "cronotipo (matutino, intermediário, noturno)", "bedtime_phone_minutes": "minutos no celular antes de dormir",
    "primary_bedtime_app": "app mais usado antes de dormir", "screen_brightness_pct": "brilho da tela (%)",
    "blue_light_filter_active": "filtro de luz azul ligado (0/1)", "caffeine_post_5pm_mg": "cafeína após 17h (mg)",
    "physical_activity_min": "atividade física (min/dia)", "sleep_latency_min": "tempo para pegar no sono (min)",
    "total_sleep_hours": "horas de sono (alvo)", "deep_sleep_pct": "sono profundo (%)", "rem_sleep_pct": "sono REM (%)",
    "morning_alarm_snoozes": "vezes que adiou o despertador", "next_day_fatigue_score": "cansaço no dia seguinte (1–10)",
    "sleep_debt_category": "categoria de dívida de sono"}
role = {c: "id" for c in IDENTIFICADOR} | {c: "leak" for c in DERIVADA_DO_ALVO} | \
       {c: "night" for c in MEDIDAS_DA_NOITE} | {c: "morning" for c in CONSEQUENCIAS} | {ALVO: "target"}
cols = []
for c in df.columns:
    v = df[c]
    item = {"name": c, "desc": desc[c], "role": role.get(c, "input"), "kind": "cat" if v.dtype == object else "num"}
    if v.dtype == object:
        item["levels"] = {k: int(n) for k, n in v.value_counts().items()}
    else:
        item.update(min=float(v.min()), max=float(v.max()), mean=round(float(v.mean()), 2))
    cols.append(item)
out["columns"] = cols

# alvo
bins = np.arange(3.0, 10.01, 0.25)
out["target"] = {"mean": r4(y.mean()), "std": r4(y.std()), "min": float(y.min()), "max": float(y.max()),
                 "median": r4(np.median(y)), "bins": [round(b, 2) for b in bins.tolist()],
                 "counts": np.histogram(y, bins=bins)[0].tolist()}
corr = df.select_dtypes("number").corr()[ALVO].drop(ALVO)
out["corr"] = [{"name": k, "r": round(float(v), 3)} for k, v in corr.sort_values(key=abs, ascending=False).items()]
out["cat_means"] = [{"name": c, "levels": [{"level": k, "mean": round(float(g.mean()), 2), "n": int(g.size)}
                     for k, g in sorted(df.groupby(c)[ALVO], key=lambda kv: kv[1].mean())]}
                    for c in ["chronotype", "occupation_type", "primary_bedtime_app", "gender"]]

# divisão e pré-processamento
out["split"] = {"train": int(len(R["ytr"])), "test": int(len(R["yte"])),
                "train_mean": r4(R["ytr"].mean()), "train_std": r4(R["ytr"].std()),
                "test_mean": r4(R["yte"].mean()), "test_std": r4(R["yte"].std())}
oh = pre.named_transformers_["cat"]
out["numeric"] = R["num"]
out["onehot"] = [{"name": n, "levels": list(map(str, lv))} for n, lv in zip(R["cat"], oh.categories_)]
out["features"] = features
zs = StandardScaler().fit(R["A"])
a = DecisionTreeRegressor(max_depth=6, random_state=SEED).fit(R["A"], R["ytr"]).predict(R["B"])
b = DecisionTreeRegressor(max_depth=6, random_state=SEED).fit(zs.transform(R["A"]), R["ytr"]).predict(zs.transform(R["B"]))
i_phone = features.index("bedtime_phone_minutes")
out["scale_check"] = {"max_diff": float(np.abs(a - b).max()), "phone_mean": r4(zs.mean_[i_phone]), "phone_std": r4(zs.scale_[i_phone])}

# busca de hiperparâmetros
res = pd.DataFrame(busca.cv_results_)
def key(d):
    return "none" if d is None else str(d)
out["grid"] = {
    "depths": [key(d) for d in PROFUNDIDADES], "leaves": MIN_POR_FOLHA,
    "test": [[r4(res[(res.param_max_depth.map(key) == key(d)) & (res.param_min_samples_leaf == l)].mean_test_score.iloc[0])
              for l in MIN_POR_FOLHA] for d in PROFUNDIDADES],
    "best": {"max_depth": busca.best_params_["max_depth"], "min_samples_leaf": busca.best_params_["min_samples_leaf"],
             "score": r4(busca.best_score_)},
}
curves = {}
for l in (1, busca.best_params_["min_samples_leaf"]):
    rr = res[res.param_min_samples_leaf == l]
    curves[str(l)] = {"train": [r4(v) for v in rr.mean_train_score], "val": [r4(v) for v in rr.mean_test_score],
                      "val_std": [r4(v) for v in rr.std_test_score]}
out["grid"]["curves"] = curves

# árvore final
t = m.tree_
out["tree_stats"] = {"depth": int(m.get_depth()), "leaves": int(m.get_n_leaves()), "nodes": int(t.node_count)}
root, L, Rr = 0, t.children_left[0], t.children_right[0]
sse = lambda i: float(t.impurity[i] * t.n_node_samples[i])
out["first_split"] = {"feature": features[t.feature[0]], "threshold": float(t.threshold[0]),
                      "root": {"n": int(t.n_node_samples[0]), "mean": r4(t.value[0][0][0]), "var": r4(t.impurity[0])},
                      "left": {"n": int(t.n_node_samples[L]), "mean": r4(t.value[L][0][0]), "var": r4(t.impurity[L])},
                      "right": {"n": int(t.n_node_samples[Rr]), "mean": r4(t.value[Rr][0][0]), "var": r4(t.impurity[Rr])},
                      "gain": r4((sse(0) - sse(L) - sse(Rr)) / sse(0))}

# resultado
def metricas(yt, yp):
    return {"r2": r4(r2_score(yt, yp)), "mae": r4(mean_absolute_error(yt, yp)), "rmse": r4(mean_squared_error(yt, yp) ** 0.5)}
err = pred - R["yte"]
out["metrics"] = {"train": metricas(R["ytr"], pred_tr), "test": metricas(R["yte"], pred),
                  "baseline": metricas(R["yte"], np.full_like(R["yte"], R["ytr"].mean())),
                  "within_30": r4(np.mean(np.abs(err) <= 0.5)), "within_60": r4(np.mean(np.abs(err) <= 1.0)),
                  "distinct_predictions": int(len(np.unique(pred)))}
out["scatter"] = {"real": [round(float(v), 2) for v in R["yte"]], "pred": [round(float(v), 3) for v in pred]}
eb = np.arange(-3.0, 3.01, 0.2)
out["residuals"] = {"bins": [round(b, 2) for b in eb.tolist()], "counts": np.histogram(np.clip(err, -2.99, 2.99), bins=eb)[0].tolist()}
imp = pd.Series(m.feature_importances_, index=features).sort_values(ascending=False)
out["importance"] = [{"name": k, "value": r4(v)} for k, v in imp.items()]

# cenários
base = IDENTIFICADOR + DERIVADA_DO_ALVO
scen = []
for label, remover in [("Só perfil e hábitos", COLUNAS_REMOVIDAS), ("+ medidas da noite", base + CONSEQUENCIAS),
                       ("+ consequências na manhã", base + MEDIDAS_DA_NOITE), ("Todas as medidas de sono", base)]:
    Q = pipeline(remover) if remover is not COLUNAS_REMOVIDAS else R
    pq = Q["m"].predict(Q["B"])
    scen.append({"label": label, "n_inputs": int(Q["Xtr"].shape[1]), "best": {k: Q["busca"].best_params_[k] for k in ("max_depth", "min_samples_leaf")},
                 **metricas(Q["yte"], pq)})
out["scenarios"] = scen
os.makedirs(DESTINO, exist_ok=True)
SAIDA = os.path.join(DESTINO, "data.json")
json.dump(out, open(SAIDA, "w"), ensure_ascii=False)

# ---------------------------------------------------------------------------
# Modelo exportado: o site percorre a árvore no navegador com estes números.
# ---------------------------------------------------------------------------
Xte = R["Xte"].reset_index(drop=True)
def row(i):
    return {k: (v if isinstance(v, str) else float(v)) for k, v in Xte.iloc[i].to_dict().items()}
# exemplos para o formulário: quem dorme pouco, perto da média e muito, mais o maior erro do modelo
order = np.argsort(R["yte"])
picks = [order[int(q * (len(order) - 1))] for q in (0.05, 0.3, 0.5, 0.7, 0.95)]
picks.append(int(np.argmax(np.abs(err))))
examples = [{"input": row(int(i)), "real": float(R["yte"][i])} for i in picks]
rng = np.random.default_rng(0)
parity = [{"input": row(int(i)), "pred": float(pred[int(i)])} for i in rng.choice(len(Xte), 40, replace=False)]
modelo = {
    "numeric": [{"name": n, "min": float(df[n].min()), "max": float(df[n].max()), "integer": bool((df[n] % 1 == 0).all())} for n in R["num"]],
    "categorical": [{"name": n, "levels": list(map(str, lv))} for n, lv in zip(R["cat"], oh.categories_)],
    "features": features,
    "tree": {"left": t.children_left.tolist(), "right": t.children_right.tolist(), "feature": t.feature.tolist(),
             "threshold": [float(v) for v in t.threshold], "value": [round(float(v[0][0]), 4) for v in t.value],
             "n": t.n_node_samples.tolist()},
    "examples": examples,
    "parity": parity,
}
SAIDA_MODELO = os.path.join(DESTINO, "model.json")
json.dump(modelo, open(SAIDA_MODELO, "w"), ensure_ascii=False, separators=(",", ":"))
print("modelo salvo em", os.path.normpath(SAIDA_MODELO))
print("dados salvos em", os.path.normpath(SAIDA))
print(json.dumps({k: out[k] for k in ("metrics", "tree_stats", "first_split", "scale_check")}, ensure_ascii=False, indent=1))
print([(s["label"], s["r2"], s["mae"]) for s in scen])
