'use client'

export default function DeleteContractButton({
  name,
  deleteAction,
}: {
  name: string
  deleteAction: () => Promise<never>
}) {
  return (
    <form action={deleteAction}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(`Delete "${name}"? This cannot be undone.`)) e.preventDefault()
        }}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        Delete
      </button>
    </form>
  )
}
