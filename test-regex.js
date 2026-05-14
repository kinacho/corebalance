const html = 'Price (EUR) mod-ui-data-list__value">123.45 / 2.5% Year to date 10.5%';
const p = html.match(/Price \(EUR\).*?mod-ui-data-list__value">([\d,.]+)/s);
const c = html.match(/\/ ([\d,.-]+)%/);
console.log(p ? p[1] : null);
console.log(c ? c[1] : null);
