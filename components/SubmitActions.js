"use client";

export default function SubmitActions({ saving, onPreview, onSubmit, successBanner }) {
  return (
    <div className="space-y-3">
      {successBanner && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-md px-4 py-2 text-sm">
          {successBanner}
        </div>
      )}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <button type="button" onClick={onPreview} disabled={saving}
          className="col-span-2 sm:col-span-1 border px-4 py-2.5 sm:py-2 rounded-md text-sm font-medium disabled:opacity-50">
          Preview
        </button>
        <button type="button" onClick={() => onSubmit("close")} disabled={saving}
          className="bg-brand-navy text-white px-4 py-2.5 sm:py-2 rounded-md text-sm font-medium disabled:opacity-50">
          {saving ? "Saving..." : "Save & Close"}
        </button>
        <button type="button" onClick={() => onSubmit("print")} disabled={saving}
          className="bg-brand-teal text-white px-4 py-2.5 sm:py-2 rounded-md text-sm font-medium disabled:opacity-50">
          {saving ? "Saving..." : "Save & Print"}
        </button>
        <button type="button" onClick={() => onSubmit("new")} disabled={saving}
          className="col-span-2 sm:col-span-1 border border-brand-navy text-brand-navy px-4 py-2.5 sm:py-2 rounded-md text-sm font-medium disabled:opacity-50">
          {saving ? "Saving..." : "Save & New"}
        </button>
      </div>
    </div>
  );
}
