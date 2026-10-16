# Executar no Google Colab

1. No Colab do Trabalho 1, envie `gpt_decision_tree_regression.py` e `bedtime_screentime_sleep_debt.csv`.
2. Execute a célula abaixo. O script é autossuficiente e não precisa instalar bibliotecas.

```python
!python3 gpt_decision_tree_regression.py \
  --csv bedtime_screentime_sleep_debt.csv \
  --output-dir gpt-export \
  --no-notebook
```

3. Baixe `gpt-export/gpt-data.json` e `gpt-export/gpt-model.json`.
4. Substitua os arquivos de mesmo nome em `src/projects/gpt-arvore-decisao/` por esses resultados. A apresentação então mostra as métricas, as regras reais e a demonstração interativa da árvore.

O alvo é `next_day_fatigue_score`. O algoritmo é uma árvore CART de regressão (DTR), ajustada com validação cruzada de 3 partes para escolher profundidade e mínimo de amostras por folha.
