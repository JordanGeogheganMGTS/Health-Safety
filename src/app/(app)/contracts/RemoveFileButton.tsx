'use client'

export default function RemoveFileButton() {
  return (
    <button
      type="submit"
      name="remove_file"
      value="true"
      className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
      onClick={(e) => {
        if (!confirm('Remove the current document?')) e.preventDefault()
      }}
    >
      Remove
    </button>
  )
}
