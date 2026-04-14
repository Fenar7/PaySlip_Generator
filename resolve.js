const fs = require('fs');

const resolveFile = (path, model, idStr, apiStr) => {
    let content = fs.readFileSync(path, 'utf8');
    
    // Resolve imports
    const importRegex = /<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>>[^\n]*\n/s;
    content = content.replace(importRegex, "$1\n$2\n");
    
    // Resolve Promise.all
    const promiseRegex = /<<<<<<< HEAD\n\s*const \[[^,]+,\s*events\] = await Promise\.all\(\[\n(.*?)\n=======\n\s*const \[[^,]+,\s*attachments\] = await Promise\.all\(\[\n(.*?)\n>>>>>>>[^\n]*\n/s;
    content = content.replace(promiseRegex, `  const [${model}, events, attachments] = await Promise.all([\n$1,\n    getDocAttachments(${idStr}, "${apiStr}"),\n`);
    
    // Resolve component rendering
    const jsxRegex = /<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>>[^\n]*\n/s;
    if (jsxRegex.test(content)) {
        content = content.replace(jsxRegex, "$1\n$2\n");
    }

    fs.writeFileSync(path, content, 'utf8');
}

resolveFile('src/app/app/docs/quotes/[id]/page.tsx', 'quote', 'id', 'quote');
resolveFile('src/app/app/docs/salary-slips/[id]/page.tsx', 'salarySlip', 'id', 'salary_slip');
resolveFile('src/app/app/docs/vouchers/[id]/page.tsx', 'voucher', 'id', 'voucher');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
schema = schema.replace(/<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>>[^\n]*\n/s, "$1\n$2\n");
fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');

