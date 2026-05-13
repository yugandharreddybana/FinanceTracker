import type { Transaction } from '../types';

function csvEscape(cell: string): string {
  const s = cell.replace(/"/g, '""');
  if (/[",\n\r]/.test(s)) return `"${s}"`;
  return s;
}

export function downloadTransactionsCsv(transactions: Transaction[], filename = 'transactions-export.csv'): void {
  const headers = ['date', 'merchant', 'category', 'type', 'amount', 'currency', 'account', 'status'];
  const rows = transactions.map((t) =>
    [
      t.date,
      t.merchant ?? '',
      t.category ?? '',
      t.type ?? '',
      String(t.amount ?? ''),
      t.currency ?? 'INR',
      String(t.account ?? ''),
      t.status ?? '',
    ].map((c) => csvEscape(String(c)))
      .join(',')
  );
  const csv = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, filename: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printTransactionsStatement(transactions: Transaction[], title = 'Transactions'): void {
  const rows = transactions
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.date)}</td><td>${escapeHtml(t.merchant ?? '')}</td><td>${escapeHtml(t.category ?? '')}</td><td>${escapeHtml(t.type ?? '')}</td><td>${escapeHtml(String(t.amount ?? ''))}</td><td>${escapeHtml(t.currency ?? 'INR')}</td></tr>`,
    )
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}th{background:#f4f4f5}</style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th>Type</th><th>Amount</th><th>Currency</th></tr></thead><tbody>${rows}</tbody></table><script>window.addEventListener("load",function(){window.print();});</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
