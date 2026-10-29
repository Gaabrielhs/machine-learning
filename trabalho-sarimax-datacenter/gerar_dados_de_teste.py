"""
Gera um CSV FALSO, com as mesmas colunas do dataset do Kaggle, só para testar o pipeline e a página
sem baixar nada. Os números NÃO representam o dataset real: nunca apresente resultados vindos daqui.

Uso:
    python gerar_dados_de_teste.py [pasta de saída]
    python gerar_dados_apresentacao.py <pasta de saída>/leituras_de_teste.csv --provisorio
"""
import os, sys
import numpy as np, pandas as pd

PASTA = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
os.makedirs(PASTA, exist_ok=True)
rng = np.random.default_rng(7)
CENTROS = [("DC-01", 16, -5, 0.0, 1.00), ("DC-02", 15, -8, 3.0, 0.85), ("DC-03", 14, -7, 8.0, 1.05)]
N = 6720  # 70 dias a cada 15 minutos
partes, rid = [], 1
for dc, servidores, utc, clima, fator in CENTROS:
    t = pd.date_range("2026-01-05", periods=N, freq="15min", tz="UTC")
    hora = t.hour + t.minute / 60
    dia = np.arange(N) / 96
    tempo = np.cumsum(rng.normal(0, 0.05, N // 96 + 1))[(dia).astype(int)]          # clima muda de dia para dia
    amb = 8 + clima + 7 * np.sin((hora - 9) / 24 * 2 * np.pi) + 3 * tempo + rng.normal(0, 0.4, N)
    fim_semana = (t.dayofweek >= 5).astype(float)
    gpu = np.clip(48 + 18 * np.sin((hora - 10) / 24 * 2 * np.pi) - 6 * fim_semana + rng.normal(0, 4, N), 5, 95)
    cpu = np.clip(32 + 9 * np.sin((hora - 9) / 24 * 2 * np.pi) - 4 * fim_semana + rng.normal(0, 3, N), 5, 95)
    trabalho = np.where(gpu > 60, "training", np.where(gpu > 45, "mixed", "inference"))
    ativos = np.full(N, servidores)
    ti = fator * (4.0 * servidores + 0.55 * gpu * servidores / 16 + 0.25 * cpu * servidores / 16) + rng.normal(0, 1.5, N)
    refrig = 0.12 * ti + 0.45 * np.clip(amb - 5, 0, None) + rng.normal(0, 0.8, N)
    total = ti + refrig + 6.0
    df = pd.DataFrame({
        "reading_id": np.arange(rid, rid + N), "timestamp": t.strftime("%Y-%m-%dT%H:%M:%SZ"), "data_center_id": dc,
        "workload_type": trabalho, "active_servers": ativos, "cpu_utilization_percent": cpu.round(2),
        "gpu_utilization_percent": gpu.round(2), "memory_usage_percent": (50 + 0.1 * gpu + rng.normal(0, 2, N)).round(2),
        "network_utilization_percent": (30 + 0.15 * cpu + rng.normal(0, 2, N)).round(2), "ambient_temperature_c": amb.round(2),
        "inlet_temperature_c": (23.5 + rng.normal(0, 0.3, N)).round(2), "it_power_kw": ti.round(2), "cooling_power_kw": refrig.round(2),
        "total_facility_power_kw": total.round(2), "pue": (total / ti).round(3), "facility_energy_kwh": (total / 4).round(3),
        "data_quality_flag": "ok", "data_origin": "synthetic"})
    ruins = rng.choice(N, 90, replace=False)
    df.loc[ruins, "data_quality_flag"] = "missing_sensor"
    df.loc[ruins[:45], "memory_usage_percent"] = np.nan
    df.loc[ruins[45:], "gpu_utilization_percent"] = np.nan
    partes.append(df)
    rid += N
pd.concat(partes).to_csv(os.path.join(PASTA, "leituras_de_teste.csv"), index=False)
print("salvo em", os.path.join(PASTA, "leituras_de_teste.csv"))
