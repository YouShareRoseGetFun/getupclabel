const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function harness(){
 const nodes={}; let canvases=0, pdf;
 function element(){return {value:'',textContent:'',className:'',children:[],listeners:{},appendChild(n){this.children.push(n)},addEventListener(t,fn){this.listeners[t]=fn},set innerHTML(v){this.children=[]},get innerHTML(){return ''}}}
 for(const id of ['msg','preview','form','upc','product','qty','sheet','btn-png','btn-svg','btn-pdf','csv'])nodes[id]=element();
 nodes.qty.value='1';nodes.sheet.value='5160';
 const document={getElementById:id=>nodes[id],querySelectorAll:()=>[],createElement:(tag)=>{if(tag==='canvas')canvases++;return {...element(),width:720,height:400,toDataURL:()=> 'image'}}};
 const ctx={document,JsBarcode(c,code,opts){assert.equal(opts.width,6);assert.equal(opts.margin,60)},jspdf:{jsPDF:function(){pdf={images:[],pages:1,addPage(){this.pages++},addImage(...args){this.images.push(args)},setFontSize(){},text(){},save(){}};return pdf}},Papa:{parse(file,opts){opts.complete(file.result)}},setTimeout};
 vm.runInNewContext(fs.readFileSync('assets/app.js','utf8'),ctx);
 return {nodes,submit(value){nodes.upc.value=value;nodes.form.listeners.submit({preventDefault(){}})},csv(rows){nodes.csv.listeners.change({target:{files:[{size:100,result:{data:rows,errors:[]}}]}})},get canvases(){return canvases},get pdf(){return pdf}};
}
test('check digits and strict rejection clear old barcodes',()=>{const h=harness();for(const [raw,result] of [['03600029145','036000291452'],['01234567890','012345678905'],['036000291452','036000291452']]){h.submit(raw);assert.match(h.nodes.msg.textContent,new RegExp(result));assert.equal(h.nodes.preview.children.length,1)}for(const raw of ['036000291453','','abc','1234567890','a03600029145','036000 29145']){h.submit(raw);assert.equal(h.nodes.preview.children.length,0);assert.match(h.nodes.msg.textContent,/Enter 11 digits/)}});
test('500 CSV rows preview only 20, all 500 export with correct pagination',()=>{const h=harness();h.csv(Array.from({length:500},()=>({upc:'03600029145',qty:'1'})));assert.equal(h.canvases,20);h.nodes['btn-pdf'].listeners.click();assert.equal(h.pdf.images.length,500);assert.equal(h.pdf.pages,17)});
test('reject oversized row count and label totals before rendering export',()=>{const h=harness();h.csv(Array.from({length:501},()=>({upc:'03600029145'})));assert.match(h.nodes.msg.textContent,/exceeds 500/);h.csv([{upc:'03600029145',qty:'999999999'}]);h.nodes['btn-pdf'].listeners.click();assert.equal(h.pdf.images.length,0);assert.match(h.nodes.msg.textContent,/1,500/)});
test('all label cells stay inside Letter paper, including third 5164 row',()=>{for(const [sheet,count] of [['5160',30],['5163',10],['5164',6]]){const h=harness();h.nodes.sheet.value=sheet;h.csv([{upc:'03600029145',qty:String(count+1)}]);h.nodes['btn-pdf'].listeners.click();assert.equal(h.pdf.pages,2);for(const [, ,x,y,w,height] of h.pdf.images){assert(x>=0&&y>=0);assert(x+w<=215.9);assert(y+height<=279.4)}}});
