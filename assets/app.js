(function () {
  'use strict';

  var LABELS = {
    '5160': { w: 66.675, h: 25.4, cols: 3, rows: 10, mt: 12.7, ml: 4.7625, gx: 3.175, gy: 0 },
    '5163': { w: 101.6, h: 50.8, cols: 2, rows: 5, mt: 12.7, ml: 4.7625, gx: 3.175, gy: 0 },
    '5164': { w: 101.6, h: 84.6667, cols: 2, rows: 3, mt: 12.7, ml: 4.7625, gx: 3.175, gy: 0 }
  };

  var $ = function (id) { return document.getElementById(id); };
  var items = [];
  var msgEl = $('msg');

  function say(text, ok) {
    msgEl.textContent = text || '';
    msgEl.className = 'msg' + (ok ? ' ok' : '');
  }

  function digits(s) { return String(s || '').trim(); }

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
    if (!/^\d{11,12}$/.test(d)) return null;
    if (d.length === 11) return d + checkDigit(d);
    if (d.length === 12) {
      return Number(d.charAt(11)) === checkDigit(d.slice(0, 11)) ? d : null;
    }
    return null;
  }

  function canvasFor(code) {
    var c = document.createElement('canvas');
    JsBarcode(c, code, {
      format: 'UPC', displayValue: true, fontSize: 54, textMargin: 6,
      margin: 60, width: 6, height: 210, background: '#ffffff', lineColor: '#000000'
    });
    return c;
  }

  function render() {
    var box = $('preview');
    box.innerHTML = '';
    items.slice(0, 20).forEach(function (it) {
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

  function clearItems() {
    items = [];
    $('preview').innerHTML = '';
  }

  ['upc', 'product', 'qty'].forEach(function (id) {
    $(id).addEventListener('input', clearItems);
  });

  function readForm() {
    var code = fullCode($('upc').value);
    if (!code) {
      clearItems();
      say('Enter 11 digits (we add the 12th) or a valid 12-digit UPC-A number.');
      return null;
    }
    var qty = Math.max(1, Math.min(300, parseInt($('qty').value, 10) || 1));
    return { upc: code, product: $('product').value.trim(), qty: qty };
  }

  if (typeof JsBarcode !== 'function' || typeof Papa === 'undefined') {
    say('A required local file could not load. Reload the page; if this continues, contact support.');
    document.querySelectorAll('button, #csv').forEach(function (el) { el.disabled = true; });
    return;
  }

  var jspdfPromise = null;
  function loadJsPDF() {
    if (jspdfPromise) return jspdfPromise;
    jspdfPromise = new Promise(function (resolve, reject) {
      if (typeof jspdf !== 'undefined' && jspdf.jsPDF) { resolve(); return; }
      var s = document.createElement('script');
      s.src = '/assets/vendor/jspdf.umd.min.js';
      s.async = true;
      s.onload = function () {
        if (typeof jspdf !== 'undefined' && jspdf.jsPDF) { resolve(); }
        else { jspdfPromise = null; reject(new Error('jspdf unavailable')); }
      };
      s.onerror = function () { jspdfPromise = null; reject(new Error('jspdf load failed')); };
      document.head.appendChild(s);
    });
    return jspdfPromise;
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
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, it.upc, { format: 'UPC', displayValue: true, fontSize: 54, margin: 60, width: 6, height: 210 });
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
    var total = items.reduce(function (sum, it) { return sum + it.qty; }, 0);
    if (total > 1500) {
      say('That is ' + total + ' labels. Reduce quantities to 1,500 labels per PDF.');
      return;
    }
    say('Preparing ' + total + ' labels as a PDF…', true);
    loadJsPDF().then(function () {
      var doc = new jspdf.jsPDF({ unit: 'mm', format: 'letter' });
      var flat = [];
      items.forEach(function (it) {
        for (var i = 0; i < it.qty; i++) flat.push(it);
      });
      flat.forEach(function (it, idx) {
        var pos = idx % perPage;
        if (idx > 0 && pos === 0) doc.addPage();
        var col = pos % sheet.cols;
        var row = Math.floor(pos / sheet.cols);
        var x = sheet.ml + col * (sheet.w + sheet.gx);
        var y = sheet.mt + row * (sheet.h + sheet.gy);
        var canvas = canvasFor(it.upc);
        var w = Math.min(sheet.w - 4, 62, (sheet.h - 5) * canvas.width / canvas.height);
        var h = w * (canvas.height / canvas.width);
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', x + 2, y + 1, w, h);
        if (it.product) {
          doc.setFontSize(7);
          doc.text(String(it.product).slice(0, 42), x + 2, y + sheet.h - 1.5);
        }
      });
      doc.save('upc-labels-' + $('sheet').value + '.pdf');
      say(flat.length + ' labels laid out on ' + $('sheet').value + ' geometry.', true);
    }).catch(function () {
      say('The PDF library could not load. Check your connection, or download PNG / SVG instead.');
    });
  });

  $('csv').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    clearItems();
    if (file.size > 2 * 1024 * 1024) { say('CSV must be no larger than 2 MB.'); return; }
    Papa.parse(file, {
      preview: 501,
      transformHeader: function (header) { return header.trim().toLowerCase(); },
      error: function () { say('Could not read this CSV. Please select the file again.'); },
      header: true, skipEmptyLines: true, complete: function (res) {
        if (res.errors && res.errors.length) { say('CSV has formatting errors. Check the header and column counts.'); return; }
        if ((res.data || []).length > 500) { say('CSV exceeds 500 rows. Split the file and try again.'); return; }
        var rows = res.data || [];
        var good = [], bad = 0;
        rows.forEach(function (r) {
          var raw = r.upc || r.upc_a || r.code || r.barcode || '';
          var code = fullCode(raw);
          if (!code) { bad++; return; }
          good.push({
            upc: code,
            product: String(r.product || r.name || r.title || '').slice(0, 60),
            qty: Math.min(1501, Math.max(1, parseInt(r.qty || r.quantity || 1, 10) || 1))
          });
        });
        if (!good.length) { say('No valid UPC-A rows found. Expect a column named upc with 11 or 12 digits.'); return; }
        items = good;
        render();
        say(good.length + ' rows loaded' + (bad ? ', ' + bad + ' skipped (invalid check digit or length)' : '') + '. Preview: first 20 rows maximum. Pick a label sheet, then Export label PDF.', true);
      }
    });
  });
})();
