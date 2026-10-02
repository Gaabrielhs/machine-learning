// Aplica o tema salvo antes da primeira pintura (evita piscar). Arquivo externo para respeitar a CSP.
try {
  var t = localStorage.getItem('trilha-ml:theme')
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t)
} catch {
  // armazenamento indisponível: segue o tema do sistema
}
