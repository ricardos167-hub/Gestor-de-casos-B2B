// Triple confirmation guard for irreversible delete actions across the app.
// Returns true only if the user accepts all three escalating prompts.
export function confirmTripleDelete(subject: string): boolean {
  if (!window.confirm(`¿Estás seguro de que deseas eliminar ${subject}?`)) return false;
  if (!window.confirm('Esta acción no se puede deshacer. ¿Confirmas que deseas continuar?')) return false;
  if (!window.confirm(`Última confirmación: al aceptar, ${subject} se eliminará de forma permanente. ¿Continuar?`)) return false;
  return true;
}
