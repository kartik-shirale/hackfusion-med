const fs = require('fs');
const path = require('path');

const files = [
    'src/components/chat/voice-mode.tsx',
    'src/components/chat/cart-sheet.tsx',
    'src/components/chat/tools/medicine-card.tsx',
    'src/components/chat/tools/payment-card.tsx',
    'src/components/chat/tools/refill-plan.tsx',
    'src/components/chat/tools/prescription-upload.tsx',
    'src/components/chat/tools/order-history-view.tsx',
    'src/components/chat/tools/order-confirmation.tsx',
    'src/components/chat/tools/cart-view.tsx',
];

const replacements = [
    ['bg-emerald-600 hover:bg-emerald-700', 'bg-[#1A1A2F] hover:bg-[#1A1A2F]/90'],
    ['bg-emerald-700', 'bg-[#1A1A2F]/90'],
    ['hover:bg-emerald-600', 'hover:bg-[#1A1A2F]'],
    ['text-emerald-700', 'text-[#1A1A2F]'],
    ['text-emerald-600', 'text-[#1A1A2F]'],
    ['text-emerald-400', 'text-[#1A1A2F]/70'],
    ['bg-emerald-600', 'bg-[#1A1A2F]'],
    ['bg-emerald-500/30', 'bg-[#1A1A2F]/20'],
    ['bg-emerald-500/20', 'bg-[#1A1A2F]/15'],
    ['bg-emerald-500', 'bg-[#1A1A2F]'],
    ['bg-emerald-100', 'bg-[#1A1A2F]/10'],
    ['bg-emerald-50/50', 'bg-[#1A1A2F]/5'],
    ['bg-emerald-50/30', 'bg-[#1A1A2F]/5'],
    ['bg-emerald-50', 'bg-[#1A1A2F]/5'],
    ['border-emerald-500/50', 'border-[#1A1A2F]/30'],
    ['border-emerald-500', 'border-[#1A1A2F]'],
    ['border-emerald-300', 'border-[#1A1A2F]/20'],
    ['border-emerald-200', 'border-[#1A1A2F]/15'],
    ['border-emerald-800', 'border-[#1A1A2F]/40'],
    ['border-emerald-900', 'border-[#1A1A2F]/50'],
    ['ring-emerald-500/30', 'ring-[#1A1A2F]/20'],
    ['ring-emerald-500/20', 'ring-[#1A1A2F]/15'],
    ['ring-emerald-400/40', 'ring-[#1A1A2F]/20'],
    ['shadow-lg shadow-emerald-500/20', 'shadow-lg shadow-[#1A1A2F]/15'],
    ['from-emerald-50', 'from-[#1A1A2F]/5'],
    ['from-emerald-500 to-teal-600', 'from-[#1A1A2F] to-[#1A1A2F]/80'],
    ['from-emerald-500', 'from-[#1A1A2F]'],
    ['to-teal-600', 'to-[#1A1A2F]/80'],
    [' dark:bg-emerald-950/30', ''],
    [' dark:bg-emerald-950/20', ''],
    [' dark:bg-emerald-950/10', ''],
    [' dark:bg-emerald-900/50', ''],
    ['dark:bg-emerald-950/30 ', ''],
    ['dark:bg-emerald-950/20 ', ''],
    ['dark:bg-emerald-950/10 ', ''],
    ['dark:bg-emerald-900/50 ', ''],
    [' dark:from-emerald-950/20', ''],
    ['dark:from-emerald-950/20 ', ''],
    [' dark:border-emerald-900', ''],
    ['dark:border-emerald-900 ', ''],
    [' dark:border-emerald-800', ''],
    ['dark:border-emerald-800 ', ''],
    [' dark:text-emerald-400', ''],
    ['dark:text-emerald-400 ', ''],
    ['"#059669"', '"#1A1A2F"'],
];

for (const f of files) {
    const fp = path.join(process.cwd(), f);
    let content = fs.readFileSync(fp, 'utf8');
    for (const [from, to] of replacements) {
        content = content.split(from).join(to);
    }
    fs.writeFileSync(fp, content, 'utf8');
    console.log('Updated:', f);
}
console.log('Done!');
