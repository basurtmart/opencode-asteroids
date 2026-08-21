---
description: Crea un git worktree en .worktrees/<nombre> a partir del argumento dado
---

Ejecuta exactamente este comando desde el directorio actual:

git worktree add .worktrees/<nombre>

El argumento que el usuario pasó al comando es: $ARGUMENTS

Deriva <nombre> así:
- Si el argumento tiene espacios, normalízalo a kebab-case: minúsculas,
  espacios → guiones, sin acentos ni caracteres especiales.
  Ejemplos: "mi nueva feature" → mi-nueva-feature | "Fix Login Bug" → fix-login-bug
- Si no hay argumento, pregunta al usuario el nombre antes de ejecutar.

Restricciones estrictas:
- NO cambies de directorio ni hagas cd dentro del worktree creado.
- NO hagas nada adicional: un solo comando, solo la creación del worktree.
- Si falla (p. ej. el worktree ya existe), reporta el error sin intentar corregirlo.
- Si el argumentos son muy largo, simplifícalo a un hombre significativo.
