"use client";

const COMPANIES = [
  { value: "PSMS", label: "ProSynergy Medical Systems (PSMS)" },
  { value: "PPM", label: "Pro Pharma Maldives (PPM)" },
];

export default function CompanySelector({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Document Company</label>
      <div className="flex flex-col sm:flex-row gap-2">
        {COMPANIES.map((c) => (
          <label key={c.value} className={`flex items-center gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer ${value === c.value ? "border-brand-navy bg-blue-50" : ""}`}>
            <input type="radio" name="company" value={c.value} checked={value === c.value} onChange={() => onChange(c.value)} />
            {c.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">Only the selected company's logo will appear on the generated document.</p>
    </div>
  );
}
