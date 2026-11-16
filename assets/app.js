(function () {
  'use strict';

  var LABELS = {
    '5160': { w: 66.7, h: 25.4, cols: 3, rows: 10, mt: 12.7, ml: 4.8, gx: 3.2, gy: 0 },
    '5163': { w: 101.6, h: 50.8, cols: 2, rows: 5, mt: 12.7, ml: 4.8, gx: 3.2, gy: 0 },
    '5164': { w: 84.7, h: 101.6, cols: 2, rows: 3, mt: 12.7, ml: 4.8, gx: 3.2, gy: 0 }
  };

  var $ = function (id) { return document.getElementById(id); };
  var items = [];
  var msgEl = $('msg');

  function say(text, ok) {
    msgEl.textContent = text || '';
    msgEl.className = 'msg' + (ok ? ' ok' : '');
  }

  function digits(s) { return String(s || '').replace(/\D+/g, ''); }

  function checkDigit(d11) {
    var sum = 0;
    for (var i = 0; i < 11; i++) {
      var d = Number(d11.charAt(i));
      sum += (i % 2 === 0) ? d * 3 : d;
    }
    return (10 - (sum % 10)) % 10;
  }

  // 11 digits -> append check digit; 12 digits -> validate; else null
  function fullCode(raw) {
    var d = digits(raw);
    if (d.length === 11) return d + checkDigit(d);
    if (d.length === 12) {
      return Number(d.charAt(11)) === checkDigit(d.slice(0, 11)) ? d : null;
    }
    return null;
  }

  function canvasFor(code) {
    var c = document.createElement('canvas');
    JsBarcode(c, code, {
      format: 'UPC', displayValue: true, fontSize: 18, textMargin: 2,
      margin: 6, width: 2, height: 70, background: '#ffffff', lineColor: '#000000'
    });
    return c;
  }

  function render() {
    var box = $('preview');
    box.innerHTML = '';
    items.forEach(function (it) {
      var wrap = document.createElement('div');
      wrap.className = 'label-preview';
      wrap.appendChild(canvasFor(it.upc));
      if (it.product) {
        var p = document.createElement('small');
        p.textContent = it.product;
        wrap.appendChild(p);
      }
      box.appendChild(wrap);
    });
  }

  function readForm() {
    var code = fullCode($('upc').value);
    if (!code) {
      say('Enter 11 digits (we add the 12th) or a valid 12-digit UPC-A number.');
      return null;
    }
    var qty = Math.max(1, Math.min(300, parseInt($('qty').value, 10) || 1));
    return { upc: code, product: $('product').value.trim(), qty: qty };
  }

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var it = readForm();
    if (!it) return;
    items = [it];
    render();
    say('Barcode ready: ' + it.upc, true);
  });

  $('btn-png').addEventListener('click', function () {
    var it = items[0] || readForm();
    if (!it) return;
    items = [it];
    render();
    canvasFor(it.upc).toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = it.upc + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });
  });

  $('btn-svg').addEventListener('click', function () {
    var it = items[0] || readForm();
    if (!it) return;
    items = [it];
    render();
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, it.upc, { format: 'UPC', displayValue: true, fontSize: 18, margin: 6, width: 2, height: 70 });
    var blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = it.upc + '.svg';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  });

  $('btn-pdf').addEventListener('click', function () {
    if (!items.length) {
      var one = readForm();
      if (!one) return;
      items = [one];
      render();
    }
    var sheet = LABELS[$('sheet').value] || LABELS['5160'];
    var perPage = sheet.cols * sheet.rows;
    var doc = new jspdf.jsPDF({ unit: 'mm', format: 'letter' });
    var flat = [];
    items.forEach(function (it) {
      for (var i = 0; i < (it.qty || 1); i++) flat.push(it);
    });
    if (flat.length > 1500) {
      say('That is ' + flat.length + ' labels — trim the batch or raise copies per run.');
      return;
    }
    flat.forEach(function (it, idx) {
      var pos = idx % perPage;
      if (idx > 0 && pos === 0) doc.addPage();
      var col = pos % sheet.cols;
      var row = Math.floor(pos / sheet.cols);
      var x = sheet.ml + col * (sheet.w + sheet.gx);
      var y = sheet.mt + row * (sheet.h + sheet.gy);
      var canvas = canvasFor(it.upc);
      var w = sheet.w - 4;
      var h = Math.min(w * (canvas.height / canvas.width), sheet.h - 5);
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', x + 2, y + 1, w, h);
      if (it.product) {
        doc.setFontSize(7);
        doc.text(String(it.product).slice(0, 42), x + 2, y + sheet.h - 1.5);
      }
    });
    doc.save('upc-labels-' + $('sheet').value + '.pdf');
    say(flat.length + ' labels laid out on ' + $('sheet').value + ' geometry.', true);
  });

  $('csv').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true, complete: function (res) {
        var rows = (res.data || []).slice(0, 500);
        var good = [], bad = 0;
        rows.forEach(function (r) {
          var raw = r.upc || r.upc_a || r.code || r.barcode || '';
          var code = fullCode(raw);
          if (!code) { bad++; return; }
          good.push({
            upc: code,
            product: String(r.product || r.name || r.title || '').slice(0, 60),
            qty: Math.max(1, parseInt(r.qty || r.quantity || 1, 10) || 1)
          });
        });
        if (!good.length) { say('No valid UPC-A rows found. Expect a column named upc with 11 or 12 digits.'); return; }
        items = good;
        render();
        say(good.length + ' rows loaded' + (bad ? ', ' + bad + ' skipped (invalid check digit or length)' : '') + '. Pick a label sheet, then Export label PDF.', true);
      }
    });
  });
})();
