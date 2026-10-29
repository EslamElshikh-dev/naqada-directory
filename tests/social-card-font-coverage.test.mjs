import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

// Read the actual TTF cmap, so an Arabic-only server font cannot silently
// turn punctuation, numbers or Latin business names into missing-glyph boxes.
function glyphCoverage(file) {
 const bytes=readFileSync(file);let cmap;
 for(let i=0;i<bytes.readUInt16BE(4);i++){
  const record=12+i*16;
  if(bytes.toString('ascii',record,record+4)==='cmap')cmap=bytes.readUInt32BE(record+8);
 }
 assert.ok(cmap,'The shipped font must contain a cmap');
 const tables=[];
 for(let i=0;i<bytes.readUInt16BE(cmap+2);i++){
  const record=cmap+4+i*8,platform=bytes.readUInt16BE(record);
  if(platform===0||platform===3)tables.push(cmap+bytes.readUInt32BE(record+4));
 }
 return code=>tables.some(offset=>{
  const format=bytes.readUInt16BE(offset);
  if(format===12){
   for(let i=0;i<bytes.readUInt32BE(offset+12);i++){
    const group=offset+16+i*12,start=bytes.readUInt32BE(group),end=bytes.readUInt32BE(group+4);
    if(code>=start&&code<=end)return bytes.readUInt32BE(group+8)+code-start!==0;
   }
  }
  if(format===4&&code<=0xffff){
   const count=bytes.readUInt16BE(offset+6)/2,ends=offset+14,starts=ends+count*2+2,deltas=starts+count*2,ranges=deltas+count*2;
   for(let i=0;i<count;i++){
    const start=bytes.readUInt16BE(starts+i*2),end=bytes.readUInt16BE(ends+i*2);
    if(code<start||code>end)continue;
    const delta=bytes.readInt16BE(deltas+i*2),range=bytes.readUInt16BE(ranges+i*2);
    let glyph=range?bytes.readUInt16BE(ranges+i*2+range+(code-start)*2):code;
    if(range&&glyph===0)return false;
    glyph=(glyph+delta)&0xffff;return glyph!==0;
   }
  }
  return false;
 });
}

test('both server social-card fonts cover Arabic marks and basic Latin punctuation',()=>{
 const required=[...new Set([
  ...Array.from({length:95},(_,i)=>i+32),
  ...Array.from('صيدلية د. إيناس محمد — 24 ساعة، Dr. Name').map(x=>x.codePointAt(0)),
  ...Array.from({length:8},(_,i)=>0x064b+i),0x0670,
 ])];
 for(const file of ['app/fonts/noto-kufi-arabic-og.ttf','app/fonts/ibm-plex-sans-arabic-og.ttf']){
  const hasGlyph=glyphCoverage(file),missing=required.filter(code=>!hasGlyph(code));
  assert.deepEqual(missing,[],file+': missing '+missing.map(x=>'U+'+x.toString(16).toUpperCase()).join(', '));
 }
});
