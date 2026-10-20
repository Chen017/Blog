import assert from 'node:assert/strict';
import test from 'node:test';
import { buildActivitySeries } from '../src/utils/statistics.ts';
test('year activity preserves older history and empty years', () => {
 const values=buildActivitySeries({'2020-03-01':2,'2026-10-19':3},'year',new Date(2026,9,19));
 assert.equal(values[0].key,'2020');assert.equal(values.at(-1).key,'2026');assert.equal(values.reduce((n,x)=>n+x.count,0),5);assert.equal(values.find(x=>x.key==='2025').count,0);
});
test('month and day activity include previous-year boundaries without shifting dates', () => {
 const counts={'2025-12-31':2,'2026-01-01':1,'2025-01-01':9};
 const now=new Date(2026,0,1);
 const months=buildActivitySeries(counts,'month',now);assert.equal(months.length,12);assert.equal(months[0].key,'2025-02');assert.equal(months.at(-2).count,2);
 const days=buildActivitySeries(counts,'day',now);assert.equal(days.length,30);assert.equal(days.at(-2).key,'2025-12-31');assert.equal(days.at(-2).count,2);assert.equal(days.at(-1).count,1);
});
test('empty activity has a stable five-year series',()=>{const series=buildActivitySeries({},'year',new Date(2026,9,19));assert.equal(series.length,5);assert.ok(series.every(x=>x.count===0));});
