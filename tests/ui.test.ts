import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function luminance(hex:string) {
  const channels=hex.match(/[a-f\d]{2}/gi)!.map(channel=>parseInt(channel,16)/255)
    .map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
function contrast(first:string,second:string) {
  const a=luminance(first),b=luminance(second);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}

test('design text, button and status token pairs meet normal-text contrast',async()=>{
  const css=await readFile('app/globals.css','utf8');
  const tokens=Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[a-f\d]{6});/gi)].map(match=>[match[1],match[2]]));
  for(const [foreground,background] of [
    ['foreground','background'],['muted-foreground','background'],
    ['muted-foreground','surface'],['surface','foreground'],
    ['surface','success'],['danger','danger-surface'],['success','success-surface'],
  ])assert.ok(contrast(tokens[foreground],tokens[background])>=4.5,`${foreground} on ${background} needs at least 4.5:1 contrast`);
  // White at 70% opacity is the secondary text on the dark pricing surface.
  const night=tokens.night.slice(1).match(/../g)!.map(channel=>parseInt(channel,16));
  const muted='#'+night.map(channel=>Math.round(255*0.7+channel*0.3).toString(16).padStart(2,'0')).join('');
  assert.ok(contrast(muted,tokens.night)>=4.5);
});
