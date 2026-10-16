#!/usr/bin/env python3
"""Trabalho 2 — regressão de fadiga com uma árvore CART.

Não usa bibliotecas externas: basta executar ``python3 gpt_decision_tree_regression.py``.
Além das métricas, o script exporta os dados usados pela apresentação React e cria um
notebook leve (gpt_decision_tree_regression.ipynb) que executa este mesmo experimento.
"""

from __future__ import annotations

import csv
import argparse
import json
import math
import random
from pathlib import Path
from statistics import mean, pstdev

SEED = 42
TARGET = "next_day_fatigue_score"
ID = "user_id"
CATEGORICAL = ["gender", "occupation_type", "chronotype", "primary_bedtime_app"]
LABELS = {
    "age": "Idade", "gender": "Gênero", "occupation_type": "Ocupação", "chronotype": "Cronotipo",
    "bedtime_phone_minutes": "Uso de celular antes de dormir (min)",
    "primary_bedtime_app": "Principal aplicativo noturno", "screen_brightness_pct": "Brilho da tela (%)",
    "blue_light_filter_active": "Filtro de luz azul ativo", "caffeine_post_5pm_mg": "Cafeína após 17h (mg)",
    "physical_activity_min": "Atividade física (min)", "sleep_latency_min": "Latência para dormir (min)",
    "total_sleep_hours": "Horas totais de sono", "deep_sleep_pct": "Sono profundo (%)",
    "rem_sleep_pct": "Sono REM (%)", "morning_alarm_snoozes": "Sonecas do alarme",
    TARGET: "Pontuação de fadiga no dia seguinte",
}


def load_rows(path: Path):
    with path.open(encoding="utf-8", newline="") as f:
        raw = list(csv.DictReader(f))
    numeric = [k for k in raw[0] if k not in CATEGORICAL + [ID, "sleep_debt_category"]]
    rows = []
    for row in raw:
        item = dict(row)
        for name in numeric:
            item[name] = float(item[name])
        rows.append(item)
    inputs = [name for name in raw[0] if name not in [ID, TARGET, "sleep_debt_category"]]
    return rows, inputs


def split_indices(n: int, test_size: float = 0.2):
    order = list(range(n))
    random.Random(SEED).shuffle(order)
    cut = int(n * (1 - test_size))
    return order[:cut], order[cut:]


class Encoder:
    def __init__(self, rows, inputs):
        self.numeric = [x for x in inputs if x not in CATEGORICAL]
        self.categorical = [x for x in inputs if x in CATEGORICAL]
        self.levels = {x: sorted({r[x] for r in rows}) for x in self.categorical}
        self.feature_names = self.numeric + [f"{x}={level}" for x in self.categorical for level in self.levels[x]]

    def encode(self, row):
        return [row[x] for x in self.numeric] + [
            float(row[x] == level) for x in self.categorical for level in self.levels[x]
        ]

    def model_json(self, rows):
        def extent(name):
            values = [r[name] for r in rows]
            return {"min": min(values), "max": max(values), "integer": all(float(v).is_integer() for v in values)}
        return {
            "numeric": [{"name": x, **extent(x)} for x in self.numeric],
            "categorical": [{"name": x, "levels": self.levels[x]} for x in self.categorical],
            "feature_names": self.feature_names,
        }


class CartRegressor:
    """Árvore de regressão CART com cortes que minimizam a soma de erros quadráticos."""
    def __init__(self, max_depth=5, min_samples_leaf=40):
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.nodes = []

    @staticmethod
    def _sse(total, total_sq, n):
        return max(0.0, total_sq - total * total / n) if n else 0.0

    def fit(self, x, y):
        self.x, self.y = x, y
        self.nodes = []
        self._grow(list(range(len(y))), 0)
        return self

    def _grow(self, indices, depth):
        ys = [self.y[i] for i in indices]
        total, total_sq = sum(ys), sum(v * v for v in ys)
        node_id = len(self.nodes)
        node = {"left": -1, "right": -1, "feature": -1, "threshold": 0.0, "value": total / len(indices),
                "n": len(indices), "sse": self._sse(total, total_sq, len(indices)), "depth": depth}
        self.nodes.append(node)
        if depth >= self.max_depth or len(indices) < 2 * self.min_samples_leaf or node["sse"] < 1e-12:
            return node_id

        best = None
        n_features = len(self.x[0])
        for feature in range(n_features):
            pairs = sorted((self.x[i][feature], self.y[i], i) for i in indices)
            left_sum = left_sq = 0.0
            for pos in range(len(pairs) - 1):
                value, target, _ = pairs[pos]
                left_sum += target
                left_sq += target * target
                left_n = pos + 1
                right_n = len(pairs) - left_n
                if left_n < self.min_samples_leaf or right_n < self.min_samples_leaf or value == pairs[pos + 1][0]:
                    continue
                right_sum, right_sq = total - left_sum, total_sq - left_sq
                score = self._sse(left_sum, left_sq, left_n) + self._sse(right_sum, right_sq, right_n)
                if best is None or score < best[0]:
                    best = (score, feature, (value + pairs[pos + 1][0]) / 2, pairs, pos)
        if best is None or best[0] >= node["sse"] - 1e-12:
            return node_id
        _, feature, threshold, pairs, pos = best
        node["feature"], node["threshold"] = feature, threshold
        node["left"] = self._grow([p[2] for p in pairs[: pos + 1]], depth + 1)
        node["right"] = self._grow([p[2] for p in pairs[pos + 1 :]], depth + 1)
        return node_id

    def predict_one(self, row):
        node = self.nodes[0]
        while node["left"] != -1:
            node = self.nodes[node["left"] if row[node["feature"]] <= node["threshold"] else node["right"]]
        return node["value"]

    def predict(self, x):
        return [self.predict_one(row) for row in x]

    def importance(self, feature_names):
        gains = [0.0] * len(feature_names)
        root_n = self.nodes[0]["n"]
        for node in self.nodes:
            if node["left"] != -1:
                gain = node["sse"] - self.nodes[node["left"]]["sse"] - self.nodes[node["right"]]["sse"]
                gains[node["feature"]] += gain * node["n"] / root_n
        total = sum(gains) or 1.0
        return [{"name": feature_names[i], "value": v / total} for i, v in enumerate(gains) if v > 0]


def metrics(actual, predicted):
    mae = mean(abs(a - p) for a, p in zip(actual, predicted))
    rmse = math.sqrt(mean((a - p) ** 2 for a, p in zip(actual, predicted)))
    center = mean(actual)
    r2 = 1 - sum((a - p) ** 2 for a, p in zip(actual, predicted)) / sum((a - center) ** 2 for a in actual)
    return {"mae": mae, "rmse": rmse, "r2": r2}


def cv_mae(rows, inputs, spec, folds=3):
    order = list(range(len(rows)))
    random.Random(SEED).shuffle(order)
    scores = []
    for fold in range(folds):
        valid = set(order[fold::folds])
        train_rows = [r for i, r in enumerate(rows) if i not in valid]
        valid_rows = [r for i, r in enumerate(rows) if i in valid]
        encoder = Encoder(train_rows, inputs)
        model = CartRegressor(**spec).fit([encoder.encode(r) for r in train_rows], [r[TARGET] for r in train_rows])
        scores.append(metrics([r[TARGET] for r in valid_rows], model.predict([encoder.encode(r) for r in valid_rows]))["mae"])
    return mean(scores), pstdev(scores)


def compact_raw(row, inputs):
    return {name: row[name] for name in inputs}


def export_notebook(script_path: Path):
    notebook = {
        "cells": [
            {"cell_type": "markdown", "metadata": {}, "source": [
                "# Trabalho 2 — Árvore de Decisão para Regressão\\n",
                "Prevê `next_day_fatigue_score` usando hábitos noturnos, perfil e medidas de sono.\\n",
                "\\n", "Execute a célula abaixo para treinar, validar e exportar os dados da apresentação."],
             "attachments": {}},
            {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [],
             "source": ["%run gpt_decision_tree_regression.py"]},
        ],
        "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                     "language_info": {"name": "python", "version": "3"}},
        "nbformat": 4, "nbformat_minor": 5,
    }
    script_path.with_suffix(".ipynb").write_text(json.dumps(notebook, ensure_ascii=False, indent=2), encoding="utf-8")


def main(csv_path: str | Path | None = None, output_dir: str | Path | None = None, create_notebook: bool = True):
    root = Path(__file__).resolve().parent
    source = Path(csv_path) if csv_path else root.parent / "trabalho-mlp-sono" / "bedtime_screentime_sleep_debt.csv"
    rows, inputs = load_rows(source)
    train_i, test_i = split_indices(len(rows))
    train_rows, test_rows = [rows[i] for i in train_i], [rows[i] for i in test_i]

    candidates = [
        {"max_depth": 3, "min_samples_leaf": 40}, {"max_depth": 4, "min_samples_leaf": 40},
        {"max_depth": 5, "min_samples_leaf": 40}, {"max_depth": 6, "min_samples_leaf": 40},
        {"max_depth": 7, "min_samples_leaf": 40}, {"max_depth": 6, "min_samples_leaf": 80},
    ]
    validation = []
    for spec in candidates:
        score, std = cv_mae(train_rows, inputs, spec)
        validation.append({**spec, "mae": score, "std": std})
        print(f"CV | profundidade={spec['max_depth']}, min_folha={spec['min_samples_leaf']}: MAE={score:.3f} ± {std:.3f}")
    best = min(validation, key=lambda x: x["mae"])
    spec = {"max_depth": best["max_depth"], "min_samples_leaf": best["min_samples_leaf"]}
    encoder = Encoder(train_rows, inputs)
    x_train, x_test = [encoder.encode(r) for r in train_rows], [encoder.encode(r) for r in test_rows]
    tree = CartRegressor(**spec).fit(x_train, [r[TARGET] for r in train_rows])
    train_pred, test_pred = tree.predict(x_train), tree.predict(x_test)
    result = {"train": metrics([r[TARGET] for r in train_rows], train_pred), "test": metrics([r[TARGET] for r in test_rows], test_pred)}
    print("\\nMelhor configuração:", spec)
    print("Treino:", result["train"])
    print("Teste:", result["test"])

    project = Path(output_dir) if output_dir else root.parent / "src" / "projects" / "gpt-arvore-decisao"
    if output_dir is None and not project.parent.is_dir():
        project = root
    project.mkdir(parents=True, exist_ok=True)
    importances = sorted(tree.importance(encoder.feature_names), key=lambda x: -x["value"])
    preview = []
    for index, node in enumerate(tree.nodes):
        if node["left"] != -1 and node["depth"] <= 2:
            preview.append({"node": index, "depth": node["depth"], "feature": encoder.feature_names[node["feature"]],
                            "threshold": node["threshold"], "n": node["n"], "value": node["value"]})
    test_examples = sorted(range(len(test_rows)), key=lambda i: abs(test_rows[i][TARGET] - test_pred[i]))
    chosen = [test_examples[0], test_examples[len(test_examples)//3], test_examples[2*len(test_examples)//3], test_examples[-1]]
    examples = [{"raw": compact_raw(test_rows[i], inputs), "actual": test_rows[i][TARGET], "prediction": test_pred[i]} for i in chosen]
    target_values = [r[TARGET] for r in rows]
    data = {
        "ready": True, "shape": [len(rows), len(rows[0])], "target": TARGET, "target_label": LABELS[TARGET], "inputs": inputs,
        "columns": [{"name": x, "label": LABELS.get(x, x), "kind": "cat" if x in CATEGORICAL else "num"} for x in inputs],
        "split": {"train": len(train_rows), "test": len(test_rows)}, "preprocessing": encoder.model_json(train_rows),
        "validation": validation, "selected": spec, "metrics": result,
        "tree": {"nodes": len(tree.nodes), "leaves": sum(n["left"] == -1 for n in tree.nodes), "depth": max(n["depth"] for n in tree.nodes), "preview": preview},
        "importance": importances[:10], "examples": examples,
        "points": [{"actual": test_rows[i][TARGET], "prediction": test_pred[i]} for i in range(0, len(test_rows), 12)],
        "target_summary": {"min": min(target_values), "max": max(target_values), "mean": mean(target_values)},
    }
    model = {**encoder.model_json(train_rows), "target": TARGET, "tree": {"nodes": tree.nodes}}
    (project / "gpt-data.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    (project / "gpt-model.json").write_text(json.dumps(model, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    if create_notebook:
        export_notebook(root / "gpt_decision_tree_regression.py")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Treina uma árvore CART para prever fadiga no dia seguinte.")
    parser.add_argument("--csv", help="caminho para bedtime_screentime_sleep_debt.csv")
    parser.add_argument("--output-dir", help="pasta que receberá gpt-data.json e gpt-model.json")
    parser.add_argument("--no-notebook", action="store_true", help="não recria o notebook")
    args = parser.parse_args()
    main(args.csv, args.output_dir, create_notebook=not args.no_notebook)
