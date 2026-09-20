'use strict';

/* =============================================================
   0. CONSTANTS
   ============================================================= */
var KATEGORI_LIST = ['Kuliner', 'Fashion & Kriya', 'Kerajinan Tangan', 'Pertanian & Perikanan', 'Jasa', 'Lainnya'];
var EMOJI_BY_KATEGORI = {
  'Kuliner':                '☕',
  'Fashion & Kriya':        '🧵',
  'Kerajinan Tangan':       '🧺',
  'Pertanian & Perikanan':  '🌶️',
  'Jasa':                   '📷',
  'Lainnya':                '🏪'
};
var DB_KEY      = 'BizIn_db_v1';
var SESSION_KEY = 'BizIn_session_v1';

/* =============================================================
   1. UTILITIES
   ============================================================= */
function escapeHtml(str){
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function uid(prefix){ return prefix+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }
function formatRupiah(n){ n=Math.round(n||0); return 'Rp'+n.toLocaleString('id-ID'); }
function formatDateShort(iso){
  var d=new Date(iso);
  if(isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
}
function isoDateOnly(d){ return d.toISOString().slice(0,10); }
function daysAgoIso(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoDateOnly(d); }
function clampStars(n){ n=parseInt(n,10)||0; return Math.max(0,Math.min(5,n)); }

async function hashPassword(pw){
  try{
    if(window.crypto&&window.crypto.subtle){
      var enc=new TextEncoder().encode(pw);
      var buf=await window.crypto.subtle.digest('SHA-256',enc);
      return Array.prototype.map.call(new Uint8Array(buf),function(b){ return b.toString(16).padStart(2,'0'); }).join('');
    }
  }catch(e){}
  var h=0,s=pw||'';
  for(var i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; }
  return 'fallback_'+Math.abs(h).toString(16);
}

function showToast(message,type){
  var wrap=document.getElementById('toast-wrap');
  var el=document.createElement('div');
  el.className='toast'+(type?' '+type:'');
  el.textContent=message;
  wrap.appendChild(el);
  setTimeout(function(){ el.remove(); },3200);
}

/* =============================================================
   2. DATA LAYER
   ============================================================= */
var DB=null;

function loadDB(){
  try{ var raw=localStorage.getItem(DB_KEY); if(raw) return JSON.parse(raw); }
  catch(e){ console.warn('Gagal membaca database lokal.',e); }
  return null;
}
function saveDB(){ localStorage.setItem(DB_KEY,JSON.stringify(DB)); }

function genTransaksi(produkIds,days,avgPerDay){
  var out=[];
  for(var d=days-1;d>=0;d--){
    var tanggal=daysAgoIso(d);
    var txToday=Math.random()<0.82?Math.max(0,Math.round(avgPerDay+(Math.random()*2-1)*avgPerDay*0.7)):0;
    for(var t=0;t<txToday;t++){
      var pid=produkIds[Math.floor(Math.random()*produkIds.length)];
      out.push({id:uid('tx'),tanggal:tanggal,produkId:pid,jumlah:1+Math.floor(Math.random()*3)});
    }
  }
  return out;
}

async function buildSeedDB(){
  var passHash={};
  var demos=['admin123','siti123','made123'];
  for(var i=0;i<demos.length;i++) passHash[demos[i]]=await hashPassword(demos[i]);

  var seeds=[
    {id:'m1',ownerUsername:'siti',nama:'Kopi Kertas',kategori:'Kuliner',kota:'Bandung',
     deskripsi:'Kedai kopi rumahan dengan biji lokal Jawa Barat, disangrai kecil setiap minggu agar selalu segar.',
     status:'terverifikasi',produk:[
       {id:'p1',nama:'Kopi Susu Gula Aren',harga:18000},
       {id:'p2',nama:'V60 Single Origin',harga:25000},
       {id:'p3',nama:'Es Kopi Kertas Signature',harga:22000}]},
    {id:'m2',ownerUsername:'made',nama:'Rumah Tenun Alit',kategori:'Fashion & Kriya',kota:'Denpasar',
     deskripsi:'Kain dan selendang tenun ikat khas Bali, ditenun tangan oleh perajin keluarga selama tiga generasi.',
     status:'terverifikasi',produk:[
       {id:'p4',nama:'Selendang Tenun Motif Patra',harga:185000},
       {id:'p5',nama:'Kain Tenun Endek 2m',harga:320000}]},
    {id:'m3',ownerUsername:null,nama:'Kebun Rempah Ibu',kategori:'Pertanian & Perikanan',kota:'Malang',
     deskripsi:'Rempah dan bumbu dapur kering hasil panen kebun keluarga di lereng Bromo, tanpa pengawet.',
     status:'terverifikasi',produk:[
       {id:'p6',nama:'Bubuk Cabai Rawit 100g',harga:15000},
       {id:'p7',nama:'Paket Bumbu Dapur Lengkap',harga:35000}]},
    {id:'m4',ownerUsername:null,nama:'Sepatu Kulit Bapak',kategori:'Kerajinan Tangan',kota:'Yogyakarta',
     deskripsi:'Sepatu dan sandal kulit asli buatan tangan, dikerjakan satu per satu di bengkel kecil Kotagede.',
     status:'terverifikasi',produk:[
       {id:'p8',nama:'Sepatu Loafer Kulit Sapi',harga:425000},
       {id:'p9',nama:'Sandal Kulit Kasual',harga:195000}]},
    {id:'m5',ownerUsername:null,nama:'Jasa Foto Kenangan',kategori:'Jasa',kota:'Surabaya',
     deskripsi:'Layanan foto acara keluarga dan UMKM, termasuk produk katalog untuk kebutuhan usaha kecil.',
     status:'terverifikasi',produk:[
       {id:'p10',nama:'Paket Foto Produk (20 foto)',harga:250000},
       {id:'p11',nama:'Sesi Foto Keluarga 1 jam',harga:400000}]},
    {id:'m6',ownerUsername:null,nama:'Sambal Bu Ratih',kategori:'Kuliner',kota:'Semarang',
     deskripsi:'Sambal botolan rumahan dengan lima varian level pedas, dimasak segar tiap dua hari sekali.',
     status:'terverifikasi',produk:[
       {id:'p12',nama:'Sambal Bawang 250ml',harga:28000},
       {id:'p13',nama:'Sambal Terasi 250ml',harga:28000},
       {id:'p14',nama:'Paket Coba 3 Varian',harga:75000}]},
    {id:'m7',ownerUsername:null,nama:'Batik Lereng Biru',kategori:'Fashion & Kriya',kota:'Surakarta',
     deskripsi:'Batik tulis dan cap dengan pewarna alami, motif klasik lereng dan modern kontemporer.',
     status:'terverifikasi',produk:[
       {id:'p15',nama:'Kemeja Batik Tulis',harga:275000},
       {id:'p16',nama:'Kain Batik Cap 2.5m',harga:165000}]},
    {id:'m8',ownerUsername:null,nama:'Anyaman Rotan Kalimantan',kategori:'Kerajinan Tangan',kota:'Banjarmasin',
     deskripsi:'Keranjang dan tas anyaman rotan asli Kalimantan, dianyam oleh kelompok perajin ibu-ibu setempat.',
     status:'menunggu',produk:[
       {id:'p17',nama:'Tas Anyaman Rotan Kecil',harga:145000},
       {id:'p18',nama:'Keranjang Serbaguna',harga:95000}]},
    {id:'m9',ownerUsername:null,nama:'Kedai Jamu Segar',kategori:'Kuliner',kota:'Medan',
     deskripsi:'Jamu tradisional racikan turun-temurun, diracik segar setiap pagi tanpa bahan pengawet.',
     status:'menunggu',produk:[
       {id:'p19',nama:'Jamu Kunyit Asam 500ml',harga:12000},
       {id:'p20',nama:'Jamu Beras Kencur 500ml',harga:12000}]}
  ];

  var reviewerNames=['Budi Santoso','Ayu Lestari','Rian Pratama','Dewi Anjani','Fajar Nugroho','Sri Wahyuni','Agus Salim','Nadia Putri'];
  var komentarPositif=[
    'Kualitasnya bagus, sesuai deskripsi.',
    'Pelayanan ramah, pesanan datang tepat waktu.',
    'Akan beli lagi, harga juga bersahabat.',
    'Rasanya autentik, khas banget.',
    'Rapi dan dikemas dengan baik.',
    'Sudah langganan dari tahun lalu, konsisten kualitasnya.'
  ];

  var users=[{id:'u-admin',role:'admin',username:'admin',passwordHash:passHash['admin123'],nama:'Admin BizIn'}];
  var umkm=[], ratings=[];

  seeds.forEach(function(seed){
    var produkIds=seed.produk.map(function(p){ return p.id; });
    var transaksi=seed.status==='terverifikasi'?genTransaksi(produkIds,14,3):[];
    var record={
      id:seed.id, ownerId:null, nama:seed.nama, kategori:seed.kategori,
      kota:seed.kota, deskripsi:seed.deskripsi, status:seed.status,
      emoji:EMOJI_BY_KATEGORI[seed.kategori]||'🏪',
      dibuat:daysAgoIso(20+Math.floor(Math.random()*40)),
      produk:seed.produk, transaksi:transaksi
    };
    umkm.push(record);

    if(seed.ownerUsername){
      var ownerId='u-'+seed.ownerUsername;
      users.push({
        id:ownerId, role:'owner', username:seed.ownerUsername,
        passwordHash:passHash[seed.ownerUsername+'123'],
        nama:seed.ownerUsername==='siti'?'Siti Amara':'Made Wirawan',
        umkmId:record.id
      });
      record.ownerId=ownerId;
    }

    if(seed.status==='terverifikasi'){
      var rc=2+Math.floor(Math.random()*3);
      for(var r=0;r<rc;r++){
        ratings.push({
          id:uid('r'), umkmId:record.id,
          nama:reviewerNames[Math.floor(Math.random()*reviewerNames.length)],
          rating:3+Math.floor(Math.random()*3),
          komentar:komentarPositif[Math.floor(Math.random()*komentarPositif.length)],
          tanggal:daysAgoIso(Math.floor(Math.random()*25))
        });
      }
    }
  });

  return {users:users,umkm:umkm,ratings:ratings};
}

async function initDB(){
  var existing=loadDB();
  if(existing){ DB=existing; return; }
  DB=await buildSeedDB();
  saveDB();
}

/* =============================================================
   3. DERIVED DATA HELPERS
   ============================================================= */
function findUmkm(id){ return DB.umkm.find(function(u){ return u.id===id; }); }
function findUser(id){ return DB.users.find(function(u){ return u.id===id; }); }
function ratingsFor(umkmId){ return DB.ratings.filter(function(r){ return r.umkmId===umkmId; }); }
function avgRating(umkmId){
  var list=ratingsFor(umkmId);
  if(!list.length) return 0;
  return list.reduce(function(a,r){ return a+r.rating; },0)/list.length;
}
function starString(avg){
  var full=Math.round(avg);
  return '★★★★★'.slice(0,full)+'☆☆☆☆☆'.slice(0,5-full);
}
function produkTerjual(umkm,produkId){
  return umkm.transaksi.filter(function(t){ return t.produkId===produkId; })
    .reduce(function(a,t){ return a+t.jumlah; },0);
}
function totalPendapatan(umkm){
  return umkm.transaksi.reduce(function(a,t){
    var p=umkm.produk.find(function(x){ return x.id===t.produkId; });
    return a+(p?p.harga*t.jumlah:0);
  },0);
}
function totalTerjualUnit(umkm){ return umkm.transaksi.reduce(function(a,t){ return a+t.jumlah; },0); }
function trend14Hari(umkm){
  var byDate={};
  umkm.transaksi.forEach(function(t){
    var p=umkm.produk.find(function(x){ return x.id===t.produkId; });
    var v=p?p.harga*t.jumlah:0;
    byDate[t.tanggal]=(byDate[t.tanggal]||0)+v;
  });
  var out=[];
  for(var d=13;d>=0;d--){
    var iso=daysAgoIso(d);
    var dt=new Date(iso);
    out.push({label:dt.toLocaleDateString('id-ID',{day:'numeric',month:'short'}),value:byDate[iso]||0});
  }
  return out;
}
function produkTerlarisData(umkm){
  return umkm.produk
    .map(function(p){ return {label:p.nama,value:produkTerjual(umkm,p.id)}; })
    .sort(function(a,b){ return b.value-a.value; });
}

/* =============================================================
   4. SESSION / AUTH
   ============================================================= */
function getSession(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); }catch(e){ return null; } }
function setSession(userId){ localStorage.setItem(SESSION_KEY,JSON.stringify({userId:userId})); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }
function currentUser(){ var s=getSession(); if(!s) return null; return findUser(s.userId)||null; }

async function login(username,password){
  var user=DB.users.find(function(u){ return u.username.toLowerCase()===String(username).toLowerCase(); });
  if(!user) return {ok:false};
  var hash=await hashPassword(password);
  if(hash!==user.passwordHash) return {ok:false};
  setSession(user.id);
  return {ok:true,user:user};
}
function logout(){
  clearSession();
  showToast('Anda telah keluar.');
  navigateTo('home');
  renderNavAuthArea();
}

/* =============================================================
   5. VALIDATION HELPERS
   ============================================================= */
function setFieldError(inputEl,hasError){
  var group=inputEl.closest('.form-group');
  if(group) group.classList.toggle('error',!!hasError);
}
function requiredValid(inputEl){
  var ok=inputEl.value.trim().length>0;
  setFieldError(inputEl,!ok);
  return ok;
}

/* =============================================================
   6. NAVIGATION / ROUTER
   ============================================================= */
var state={
  view:'home', detailUmkmId:null, ownerTab:'ringkasan', adminTab:'verifikasi',
  filters:{q:'',kategori:'',kota:'',sort:'terbaru'}
};

function navigateTo(view,opts){
  opts=opts||{};
  var user=currentUser();
  if(view==='owner'&&(!user||user.role!=='owner')){
    showToast('Silakan masuk sebagai pemilik UMKM terlebih dahulu.','error');
    openAuthModal('login'); return;
  }
  if(view==='admin'&&(!user||user.role!=='admin')){
    showToast('Halaman ini khusus admin.','error');
    openAuthModal('login'); return;
  }
  state.view=view;
  if(opts.detailUmkmId) state.detailUmkmId=opts.detailUmkmId;
  document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
  var el=document.getElementById('view-'+view);
  if(el) el.classList.add('active');
  if(view==='home')   renderDirectory();
  if(view==='detail') renderDetail(state.detailUmkmId);
  if(view==='owner')  renderOwnerDashboard();
  if(view==='admin')  renderAdminDashboard();
  window.scrollTo({top:0,behavior:'auto'});
}

/* =============================================================
   7. RENDER: NAVBAR
   ============================================================= */
function renderNavAuthArea(){
  var wrap=document.getElementById('nav-actions');
  var user=currentUser();
  if(!user){
    wrap.innerHTML=
      '<button class="btn btn-outline btn-sm" data-action="open-login">Masuk</button>'+
      '<button class="btn btn-primary btn-sm" data-action="open-register-umkm">Daftarkan UMKM</button>';
    return;
  }
  var label=user.role==='admin'?'Dashboard Admin':'Dashboard Toko';
  var target=user.role==='admin'?'admin':'owner';
  wrap.innerHTML=
    '<div class="nav-user">'+
      '<div><div class="nav-user-name">'+escapeHtml(user.nama)+'</div>'+
      '<div class="nav-user-role">'+(user.role==='admin'?'Administrator':'Pemilik UMKM')+'</div></div>'+
      '<button class="btn btn-primary btn-sm" data-navto="'+target+'">'+label+'</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="logout">Keluar</button>'+
    '</div>';
}

/* =============================================================
   8. RENDER: HOME / DIRECTORY
   ============================================================= */
function populateKategoriSelects(){
  ['search-kategori','reg-kategori','profil-kategori'].forEach(function(id){
    var sel=document.getElementById(id);
    if(!sel) return;
    var keepFirst=id==='search-kategori';
    var html=keepFirst?'<option value="">Semua kategori</option>':'';
    KATEGORI_LIST.forEach(function(k){ html+='<option value="'+escapeHtml(k)+'">'+escapeHtml(k)+'</option>'; });
    sel.innerHTML=html;
  });
  var kotaSel=document.getElementById('search-kota');
  var kotaSet=Array.from(new Set(DB.umkm.filter(function(u){ return u.status==='terverifikasi'; }).map(function(u){ return u.kota; }))).sort();
  var kotaHtml='<option value="">Semua kota</option>';
  kotaSet.forEach(function(k){ kotaHtml+='<option value="'+escapeHtml(k)+'">'+escapeHtml(k)+'</option>'; });
  kotaSel.innerHTML=kotaHtml;
}

function renderHeroStats(){
  var verified=DB.umkm.filter(function(u){ return u.status==='terverifikasi'; });
  var kota=new Set(verified.map(function(u){ return u.kota; }));
  var wrap=document.getElementById('hero-stats');
  wrap.innerHTML=
    '<div class="hero-stat"><b>'+verified.length+'</b><span>UMKM terverifikasi</span></div>'+
    '<div class="hero-stat"><b>'+kota.size+'</b><span>Kota terjangkau</span></div>'+
    '<div class="hero-stat"><b>'+DB.ratings.length+'</b><span>Ulasan pembeli</span></div>';
}

function renderKategoriPills(){
  var wrap=document.getElementById('kategori-pills');
  var html='<button type="button" class="pill'+(state.filters.kategori===''?' active':'')+'" data-pill="">Semua</button>';
  KATEGORI_LIST.forEach(function(k){
    html+='<button type="button" class="pill'+(state.filters.kategori===k?' active':'')+'" data-pill="'+escapeHtml(k)+'">'+escapeHtml(k)+'</button>';
  });
  wrap.innerHTML=html;
}

function renderDirectory(){
  renderHeroStats();
  populateKategoriSelects();
  renderKategoriPills();
  var f=state.filters;
  var list=DB.umkm.filter(function(u){ return u.status==='terverifikasi'; });
  if(f.q){ var q=f.q.toLowerCase(); list=list.filter(function(u){ return u.nama.toLowerCase().indexOf(q)!==-1; }); }
  if(f.kategori) list=list.filter(function(u){ return u.kategori===f.kategori; });
  if(f.kota)     list=list.filter(function(u){ return u.kota===f.kota; });
  if(f.sort==='rating')     list=list.slice().sort(function(a,b){ return avgRating(b.id)-avgRating(a.id); });
  else if(f.sort==='nama')  list=list.slice().sort(function(a,b){ return a.nama.localeCompare(b.nama); });
  else                      list=list.slice().sort(function(a,b){ return new Date(b.dibuat)-new Date(a.dibuat); });

  var grid=document.getElementById('directory-grid');
  if(!list.length){
    grid.innerHTML='<div class="empty-state"><h4>Belum ada UMKM yang cocok</h4><p>Coba ubah kata kunci, kategori, atau kota pencarian Anda.</p></div>';
    return;
  }
  grid.innerHTML=list.map(function(u){
    var avg=avgRating(u.id), count=ratingsFor(u.id).length;
    return (
      '<div class="umkm-card">'+
        '<a href="#" class="umkm-card-link" data-detail="'+u.id+'">'+
          '<div class="umkm-card-top" style="background:'+cardTint(u.kategori)+'">'+u.emoji+'</div>'+
        '</a>'+
        '<div class="umkm-card-body">'+
          '<span class="umkm-card-cat">'+escapeHtml(u.kategori)+' · '+escapeHtml(u.kota)+'</span>'+
          '<a href="#" data-detail="'+u.id+'" style="text-decoration:none;color:inherit;"><h3>'+escapeHtml(u.nama)+'</h3></a>'+
          '<p class="umkm-card-desc">'+escapeHtml(truncate(u.deskripsi,90))+'</p>'+
          '<div class="umkm-card-foot">'+
            '<span><span class="stars">'+starString(avg)+'</span> <span class="rating-count">('+count+')</span></span>'+
            '<span class="badge badge-verified">✓ Terverifikasi</span>'+
          '</div>'+
        '</div>'+
      '</div>'
    );
  }).join('');
}

function truncate(s,n){ return s.length>n?s.slice(0,n-1)+'…':s; }
function cardTint(kategori){
  var map={
    'Kuliner':'linear-gradient(135deg,#F3E3D3,#EDD5BE)',
    'Fashion & Kriya':'linear-gradient(135deg,#E4E6EF,#D4D8EE)',
    'Kerajinan Tangan':'linear-gradient(135deg,#EFE6D8,#E4D8C4)',
    'Pertanian & Perikanan':'linear-gradient(135deg,#E1EBDD,#D1E6CA)',
    'Jasa':'linear-gradient(135deg,#E6EDF2,#D4E4EF)',
    'Lainnya':'linear-gradient(135deg,#EDE9DA,#E2DCCA)'
  };
  return map[kategori]||'linear-gradient(135deg,#EDE9DA,#E2DCCA)';
}

/* =============================================================
   9. RENDER: DETAIL UMKM
   ============================================================= */
function renderDetail(id){
  var u=findUmkm(id);
  if(!u){ navigateTo('home'); return; }
  document.getElementById('detail-emoji').textContent=u.emoji;
  document.getElementById('detail-nama').textContent=u.nama;
  document.getElementById('detail-kategori').textContent=u.kategori;
  document.getElementById('detail-kota').textContent=u.kota;
  document.getElementById('detail-desc').textContent=u.deskripsi;
  var avg=avgRating(u.id), count=ratingsFor(u.id).length;
  document.getElementById('detail-stars').textContent=starString(avg);
  document.getElementById('detail-rating-text').textContent=count?(avg.toFixed(1)+' dari '+count+' ulasan'):'Belum ada ulasan';
  document.getElementById('detail-produk').innerHTML=u.produk.map(function(p){
    return '<div class="product-row"><div><div class="product-name">'+escapeHtml(p.nama)+'</div><div class="product-sold">'+produkTerjual(u,p.id)+' terjual</div></div><div class="product-price">'+formatRupiah(p.harga)+'</div></div>';
  }).join('')||'<p class="form-hint">Belum ada produk terdaftar.</p>';
  var reviews=ratingsFor(u.id).slice().sort(function(a,b){ return new Date(b.tanggal)-new Date(a.tanggal); });
  document.getElementById('detail-review-count').textContent=reviews.length;
  document.getElementById('detail-reviews').innerHTML=reviews.length?reviews.map(function(r){
    return '<div class="review"><div class="review-top"><span class="review-name">'+escapeHtml(r.nama)+'</span><span class="review-date">'+formatDateShort(r.tanggal)+'</span></div><div class="stars">'+starString(r.rating)+'</div>'+(r.komentar?'<div class="review-text">'+escapeHtml(r.komentar)+'</div>':'')+'</div>';
  }).join(''):'<p class="form-hint">Jadilah yang pertama memberi ulasan.</p>';
  document.getElementById('rating-form').reset();
  var si=document.getElementById('rating-star-input');
  si.dataset.value='0';
  updateStarInputUI();
  document.querySelectorAll('#view-detail .form-group').forEach(function(g){ g.classList.remove('error'); });
}

/* =============================================================
   10. CHARTS (canvas — no external dependency)
   ============================================================= */
function setupCanvasHiDPI(canvas,cssHeight){
  var cssWidth=canvas.parentElement.clientWidth;
  var dpr=window.devicePixelRatio||1;
  canvas.style.width=cssWidth+'px'; canvas.style.height=cssHeight+'px';
  canvas.width=Math.round(cssWidth*dpr); canvas.height=Math.round(cssHeight*dpr);
  var ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx:ctx,w:cssWidth,h:cssHeight};
}

function drawBarChart(canvasId,items,color){
  var canvas=document.getElementById(canvasId);
  if(!canvas) return;
  var s=setupCanvasHiDPI(canvas,220), ctx=s.ctx, w=s.w, h=s.h;
  ctx.clearRect(0,0,w,h);
  var pL=8,pR=8,pT=12,pB=36,cW=w-pL-pR,cH=h-pT-pB;
  var max=Math.max.apply(null,items.map(function(i){ return i.value; }).concat([1]));
  var n=items.length||1, gap=14;
  var barW=Math.max(10,(cW-gap*(n-1))/n);
  ctx.strokeStyle='#E8E3D3'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(pL,pT+cH); ctx.lineTo(pL+cW,pT+cH); ctx.stroke();
  items.forEach(function(item,i){
    var barH=max>0?(item.value/max)*(cH-18):0;
    var x=pL+i*(barW+gap), y=pT+cH-barH;
    ctx.fillStyle=color;
    var r=Math.min(6,barW/2);
    roundRectPath(ctx,x,y,barW,barH,r); ctx.fill();
    ctx.fillStyle='#22201B'; ctx.font='600 12px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center';
    ctx.fillText(String(item.value),x+barW/2,y-6>=pT?y-6:pT+10);
    ctx.fillStyle='#6B6558'; ctx.font='600 10.5px "Plus Jakarta Sans",sans-serif';
    var lbl=item.label.length>12?item.label.slice(0,11)+'…':item.label;
    ctx.fillText(lbl,x+barW/2,pT+cH+16);
  });
}

function roundRectPath(ctx,x,y,w,h,r){
  if(h<=0) h=0.0001;
  ctx.beginPath();
  ctx.moveTo(x,y+h); ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+r,y,r); ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h);
  ctx.closePath();
}

function drawTrendChart(canvasId,points,color){
  var canvas=document.getElementById(canvasId);
  if(!canvas) return;
  var s=setupCanvasHiDPI(canvas,220), ctx=s.ctx, w=s.w, h=s.h;
  ctx.clearRect(0,0,w,h);
  var pL=10,pR=10,pT=16,pB=30,cW=w-pL-pR,cH=h-pT-pB;
  var max=Math.max.apply(null,points.map(function(p){ return p.value; }).concat([1]));
  var n=points.length, stepX=n>1?cW/(n-1):0;
  ctx.strokeStyle='#E8E3D3'; ctx.lineWidth=1;
  for(var g=0;g<=3;g++){ var gy=pT+(cH/3)*g; ctx.beginPath(); ctx.moveTo(pL,gy); ctx.lineTo(pL+cW,gy); ctx.stroke(); }
  function xy(i){ return [pL+i*stepX, pT+cH-(max>0?(points[i].value/max)*cH:0)]; }
  ctx.beginPath();
  points.forEach(function(p,i){ var v=xy(i); if(i===0) ctx.moveTo(v[0],v[1]); else ctx.lineTo(v[0],v[1]); });
  ctx.lineTo(pL+cW,pT+cH); ctx.lineTo(pL,pT+cH); ctx.closePath();
  ctx.fillStyle=color+'22'; ctx.fill();
  ctx.beginPath();
  points.forEach(function(p,i){ var v=xy(i); if(i===0) ctx.moveTo(v[0],v[1]); else ctx.lineTo(v[0],v[1]); });
  ctx.strokeStyle=color; ctx.lineWidth=2.2; ctx.lineJoin='round'; ctx.stroke();
  points.forEach(function(p,i){ var v=xy(i); ctx.beginPath(); ctx.arc(v[0],v[1],2.6,0,Math.PI*2); ctx.fillStyle=color; ctx.fill(); });
  ctx.fillStyle='#6B6558'; ctx.font='600 10px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center';
  points.forEach(function(p,i){ if(n>8&&i%2!==0) return; var v=xy(i); ctx.fillText(p.label,v[0],pT+cH+18); });
}

/* =============================================================
   11. RENDER: OWNER DASHBOARD
   ============================================================= */
function currentOwnerUmkm(){ var u=currentUser(); if(!u||u.role!=='owner') return null; return findUmkm(u.umkmId); }

function renderOwnerDashboard(){
  var u=currentOwnerUmkm();
  if(!u) return;
  document.getElementById('owner-toko-nama').textContent=u.nama;
  var badge=document.getElementById('owner-status-badge');
  if(u.status==='terverifikasi')    { badge.className='badge badge-verified'; badge.textContent='✓ Terverifikasi'; }
  else if(u.status==='menunggu')    { badge.className='badge badge-pending';  badge.textContent='⏳ Menunggu verifikasi'; }
  else                              { badge.className='badge badge-rejected'; badge.textContent='✕ Ditolak'; }
  document.getElementById('stat-pendapatan').textContent=formatRupiah(totalPendapatan(u));
  document.getElementById('stat-terjual').textContent=totalTerjualUnit(u)+' unit';
  var avg=avgRating(u.id);
  document.getElementById('stat-rating').textContent=ratingsFor(u.id).length?(avg.toFixed(1)+' ★'):'Belum ada';
  document.getElementById('stat-produk').textContent=u.produk.length;
  drawTrendChart('chart-trend',trend14Hari(u),'#253A52');
  drawBarChart('chart-produk',produkTerlarisData(u).slice(0,5),'#D9A441');
  renderProdukTable(u);
  document.getElementById('profil-nama').value=u.nama;
  document.getElementById('profil-kategori').value=u.kategori;
  document.getElementById('profil-kota').value=u.kota;
  document.getElementById('profil-deskripsi').value=u.deskripsi;
  setOwnerTab(state.ownerTab);
}

function renderProdukTable(u){
  var body=document.getElementById('produk-table-body');
  if(!u.produk.length){ body.innerHTML='<tr><td colspan="5"><p class="form-hint">Belum ada produk. Tambahkan produk pertama Anda di atas.</p></td></tr>'; return; }
  body.innerHTML=u.produk.map(function(p){
    return '<tr><td>'+escapeHtml(p.nama)+'</td><td>'+formatRupiah(p.harga)+'</td><td>'+produkTerjual(u,p.id)+'</td>'+
      '<td><div class="table-actions"><input type="number" min="1" value="1" style="width:64px;padding:6px 8px;" id="qty-'+p.id+'"><button class="icon-btn" data-catat="'+p.id+'">Catat jual</button></div></td>'+
      '<td><button class="icon-btn danger" data-hapus-produk="'+p.id+'">Hapus</button></td></tr>';
  }).join('');
}

function setOwnerTab(tab){
  state.ownerTab=tab;
  document.querySelectorAll('#owner-nav [data-dashtab]').forEach(function(a){ a.classList.toggle('active',a.dataset.dashtab===tab); });
  document.querySelectorAll('#view-owner .dash-tab').forEach(function(t){ t.classList.remove('active'); });
  document.getElementById('owner-tab-'+tab).classList.add('active');
}

/* =============================================================
   12. RENDER: ADMIN DASHBOARD
   ============================================================= */
function renderAdminDashboard(){
  var pending=DB.umkm.filter(function(u){ return u.status==='menunggu'; });
  document.getElementById('admin-pending-list').innerHTML=pending.length?pending.map(function(u){
    return '<div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">'+
      '<div><div style="font-weight:700;font-size:16px;">'+escapeHtml(u.nama)+' <span class="badge badge-pending" style="margin-left:6px;">Menunggu</span></div>'+
      '<div class="form-hint" style="margin-top:4px;">'+escapeHtml(u.kategori)+' · '+escapeHtml(u.kota)+' · diajukan '+formatDateShort(u.dibuat)+'</div>'+
      '<p style="font-size:13.5px;color:var(--muted);margin-top:8px;max-width:60ch;">'+escapeHtml(u.deskripsi)+'</p></div>'+
      '<div class="table-actions"><button class="btn btn-primary btn-sm" data-verify="'+u.id+'">Setujui</button>'+
      '<button class="btn btn-danger-outline btn-sm" data-reject="'+u.id+'">Tolak</button></div></div>';
  }).join(''):'<div class="empty-state"><h4>Tidak ada yang menunggu</h4><p>Semua pengajuan UMKM sudah diproses.</p></div>';

  document.getElementById('admin-all-table-body').innerHTML=DB.umkm.map(function(u){
    var sb=u.status==='terverifikasi'?'<span class="badge badge-verified">✓ Terverifikasi</span>':
           u.status==='menunggu'?'<span class="badge badge-pending">⏳ Menunggu</span>':
           '<span class="badge badge-rejected">✕ Ditolak</span>';
    return '<tr><td>'+escapeHtml(u.nama)+'</td><td>'+escapeHtml(u.kategori)+'</td><td>'+escapeHtml(u.kota)+'</td><td>'+sb+'</td>'+
           '<td><button class="icon-btn danger" data-hapus-umkm="'+u.id+'">Hapus</button></td></tr>';
  }).join('');

  var vc=DB.umkm.filter(function(u){ return u.status==='terverifikasi'; }).length;
  var pc=DB.umkm.filter(function(u){ return u.status==='menunggu'; }).length;
  document.getElementById('admin-stat-total').textContent=DB.umkm.length;
  document.getElementById('admin-stat-verified').textContent=vc;
  document.getElementById('admin-stat-pending').textContent=pc;
  document.getElementById('admin-stat-ratings').textContent=DB.ratings.length;

  drawBarChart('chart-admin-kategori',KATEGORI_LIST.map(function(k){
    return {label:k,value:DB.umkm.filter(function(u){ return u.kategori===k&&u.status==='terverifikasi'; }).length};
  }),'#253A52');
  setAdminTab(state.adminTab);
}

function setAdminTab(tab){
  state.adminTab=tab;
  document.querySelectorAll('#view-admin [data-dashtab-admin]').forEach(function(a){ a.classList.toggle('active',a.dataset.dashtabAdmin===tab); });
  document.querySelectorAll('#view-admin .dash-tab').forEach(function(t){ t.classList.remove('active'); });
  document.getElementById('admin-tab-'+tab).classList.add('active');
}

/* =============================================================
   13. STAR INPUT
   ============================================================= */
function updateStarInputUI(){
  var input=document.getElementById('rating-star-input');
  var val=parseInt(input.dataset.value,10)||0;
  input.querySelectorAll('button').forEach(function(btn){ btn.classList.toggle('on',parseInt(btn.dataset.star,10)<=val); });
}

/* =============================================================
   14. MODAL CONTROL
   ============================================================= */
function openAuthModal(tab){
  var overlay=document.getElementById('auth-overlay');
  overlay.classList.remove('hidden');
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ overlay.classList.add('modal-visible'); }); });
  setAuthTab(tab||'login');
}
function closeModal(){
  var overlay=document.getElementById('auth-overlay');
  overlay.classList.remove('modal-visible');
  overlay.addEventListener('transitionend',function handler(e){
    if(e.propertyName==='backdrop-filter'||e.propertyName==='background'){
      overlay.classList.add('hidden');
      overlay.removeEventListener('transitionend',handler);
    }
  });
}
function setAuthTab(tab){
  document.querySelectorAll('[data-authtab]').forEach(function(b){ b.classList.toggle('active',b.dataset.authtab===tab); });
  document.getElementById('login-form').classList.toggle('hidden',tab!=='login');
  document.getElementById('register-form').classList.toggle('hidden',tab!=='register');
  document.getElementById('auth-title').textContent=tab==='login'?'Masuk':'Daftarkan UMKM';
}

/* =============================================================
   15. EVENT WIRING
   ============================================================= */
function wireEvents(){
  document.addEventListener('click',function(e){
    var t=e.target;

    var navto=t.closest('[data-nav]');
    if(navto){ e.preventDefault(); navigateTo(navto.dataset.nav); return; }

    var navtoBtn=t.closest('[data-navto]');
    if(navtoBtn){ e.preventDefault(); navigateTo(navtoBtn.dataset.navto); return; }

    var scrollLink=t.closest('[data-scroll]');
    if(scrollLink&&state.view!=='home'){ e.preventDefault(); navigateTo('home'); setTimeout(function(){ document.getElementById(scrollLink.dataset.scroll).scrollIntoView({behavior:'smooth'}); },30); return; }

    var detailLink=t.closest('[data-detail]');
    if(detailLink){ e.preventDefault(); navigateTo('detail',{detailUmkmId:detailLink.dataset.detail}); return; }

    var action=t.closest('[data-action]');
    if(action){
      e.preventDefault();
      var a=action.dataset.action;
      if(a==='open-login')         openAuthModal('login');
      else if(a==='open-register-umkm') openAuthModal('register');
      else if(a==='close-modal')   closeModal();
      else if(a==='logout')        logout();
      else if(a==='reset-demo'){
        if(confirm('Reset seluruh data demo (akun, UMKM, rating) ke kondisi awal?')){
          localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); location.reload();
        }
      }
      return;
    }

    var authTabBtn=t.closest('[data-authtab]');
    if(authTabBtn){ setAuthTab(authTabBtn.dataset.authtab); return; }

    var pill=t.closest('[data-pill]');
    if(pill){ state.filters.kategori=pill.dataset.pill; renderDirectory(); return; }

    var star=t.closest('#rating-star-input button');
    if(star){ document.getElementById('rating-star-input').dataset.value=star.dataset.star; updateStarInputUI(); return; }

    var ownerTab=t.closest('#owner-nav [data-dashtab]');
    if(ownerTab){ e.preventDefault(); setOwnerTab(ownerTab.dataset.dashtab); return; }

    var adminTab=t.closest('[data-dashtab-admin]');
    if(adminTab){ e.preventDefault(); setAdminTab(adminTab.dataset.dashtabAdmin); return; }

    var verifyBtn=t.closest('[data-verify]');
    if(verifyBtn){ setUmkmStatus(verifyBtn.dataset.verify,'terverifikasi'); return; }
    var rejectBtn=t.closest('[data-reject]');
    if(rejectBtn){ setUmkmStatus(rejectBtn.dataset.reject,'ditolak'); return; }
    var deleteUmkmBtn=t.closest('[data-hapus-umkm]');
    if(deleteUmkmBtn){ deleteUmkm(deleteUmkmBtn.dataset.hapusUmkm); return; }
    var deleteProdukBtn=t.closest('[data-hapus-produk]');
    if(deleteProdukBtn){ deleteProduk(deleteProdukBtn.dataset.hapusProduk); return; }
    var catatBtn=t.closest('[data-catat]');
    if(catatBtn){ catatPenjualan(catatBtn.dataset.catat); return; }
  });

  document.getElementById('auth-overlay').addEventListener('click',function(e){ if(e.target.id==='auth-overlay') closeModal(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeModal(); });
  document.getElementById('nav-toggle').addEventListener('click',function(){
    var links=document.querySelector('.nav-links');
    links.style.display=links.style.display==='flex'?'none':'flex';
  });

  document.getElementById('search-form').addEventListener('submit',function(e){
    e.preventDefault();
    state.filters.q=document.getElementById('search-q').value.trim();
    state.filters.kategori=document.getElementById('search-kategori').value;
    state.filters.kota=document.getElementById('search-kota').value;
    if(state.view!=='home') navigateTo('home'); else renderDirectory();
    setTimeout(function(){ document.getElementById('direktori').scrollIntoView({behavior:'smooth'}); },20);
  });
  document.getElementById('sort-select').addEventListener('change',function(){ state.filters.sort=this.value; renderDirectory(); });

  document.getElementById('login-form').addEventListener('submit',async function(e){
    e.preventDefault();
    var userEl=document.getElementById('login-username'), passEl=document.getElementById('login-password');
    if(!requiredValid(userEl)||!requiredValid(passEl)) return;
    document.getElementById('login-error').style.display='none';
    var result=await login(userEl.value.trim(),passEl.value);
    if(!result.ok){ setFieldError(passEl,true); document.getElementById('login-error').style.display='block'; return; }
    closeModal(); renderNavAuthArea();
    showToast('Selamat datang kembali, '+result.user.nama+'.','success');
    navigateTo(result.user.role==='admin'?'admin':'owner');
    this.reset();
  });

  document.getElementById('register-form').addEventListener('submit',async function(e){
    e.preventDefault();
    var fields=['reg-nama-usaha','reg-kategori','reg-kota','reg-deskripsi','reg-username','reg-password'];
    var allOk=true;
    fields.forEach(function(id){ if(!requiredValid(document.getElementById(id))) allOk=false; });
    var usernameEl=document.getElementById('reg-username'), passEl=document.getElementById('reg-password');
    var taken=DB.users.some(function(u){ return u.username.toLowerCase()===usernameEl.value.trim().toLowerCase(); });
    document.getElementById('reg-username-error').style.display='none';
    if(taken){ setFieldError(usernameEl,true); document.getElementById('reg-username-error').style.display='block'; allOk=false; }
    if(passEl.value.length<6){ setFieldError(passEl,true); allOk=false; }
    if(!allOk) return;

    var newUmkmId=uid('m'), newUserId=uid('u'), hash=await hashPassword(passEl.value);
    var kat=document.getElementById('reg-kategori').value;
    DB.umkm.push({
      id:newUmkmId, ownerId:newUserId,
      nama:document.getElementById('reg-nama-usaha').value.trim(),
      kategori:kat, kota:document.getElementById('reg-kota').value.trim(),
      deskripsi:document.getElementById('reg-deskripsi').value.trim(),
      status:'menunggu', emoji:EMOJI_BY_KATEGORI[kat]||'🏪',
      dibuat:isoDateOnly(new Date()), produk:[], transaksi:[]
    });
    DB.users.push({id:newUserId,role:'owner',username:usernameEl.value.trim(),passwordHash:hash,nama:usernameEl.value.trim(),umkmId:newUmkmId});
    saveDB(); setSession(newUserId); closeModal(); renderNavAuthArea();
    showToast('UMKM berhasil didaftarkan! Menunggu verifikasi admin.','success');
    this.reset(); navigateTo('owner');
  });

  document.getElementById('rating-form').addEventListener('submit',function(e){
    e.preventDefault();
    var namaEl=document.getElementById('rating-nama');
    var okNama=requiredValid(namaEl);
    var starVal=clampStars(document.getElementById('rating-star-input').dataset.value);
    document.getElementById('rating-star-error').style.display=starVal>0?'none':'block';
    if(!okNama||starVal===0) return;
    DB.ratings.push({id:uid('r'),umkmId:state.detailUmkmId,nama:namaEl.value.trim().slice(0,60),rating:starVal,komentar:document.getElementById('rating-komentar').value.trim().slice(0,240),tanggal:isoDateOnly(new Date())});
    saveDB(); showToast('Terima kasih atas ulasan Anda!','success'); renderDetail(state.detailUmkmId);
  });

  document.getElementById('add-produk-form').addEventListener('submit',function(e){
    e.preventDefault();
    var namaEl=document.getElementById('produk-nama'), hargaEl=document.getElementById('produk-harga');
    var okNama=requiredValid(namaEl), harga=parseInt(hargaEl.value,10), okHarga=harga>0;
    setFieldError(hargaEl,!okHarga);
    if(!okNama||!okHarga) return;
    var u=currentOwnerUmkm();
    u.produk.push({id:uid('p'),nama:namaEl.value.trim().slice(0,60),harga:harga});
    saveDB(); this.reset(); showToast('Produk ditambahkan.','success'); renderOwnerDashboard();
  });

  document.getElementById('profil-form').addEventListener('submit',function(e){
    e.preventDefault();
    var fields=['profil-nama','profil-kategori','profil-kota','profil-deskripsi'];
    var allOk=true;
    fields.forEach(function(id){ if(!requiredValid(document.getElementById(id))) allOk=false; });
    if(!allOk) return;
    var u=currentOwnerUmkm();
    u.nama=document.getElementById('profil-nama').value.trim().slice(0,60);
    u.kategori=document.getElementById('profil-kategori').value;
    u.kota=document.getElementById('profil-kota').value.trim().slice(0,40);
    u.deskripsi=document.getElementById('profil-deskripsi').value.trim().slice(0,280);
    u.emoji=EMOJI_BY_KATEGORI[u.kategori]||u.emoji;
    saveDB(); showToast('Profil toko diperbarui.','success'); renderOwnerDashboard();
  });

  window.addEventListener('resize',debounce(function(){
    if(state.view==='owner') renderOwnerDashboard();
    if(state.view==='admin') renderAdminDashboard();
  },200));
}

function debounce(fn,wait){
  var t;
  return function(){ var args=arguments,ctx=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(ctx,args); },wait); };
}

function setUmkmStatus(id,status){
  var u=findUmkm(id); if(!u) return;
  u.status=status;
  if(status==='terverifikasi'&&u.transaksi.length===0&&u.produk.length)
    u.transaksi=genTransaksi(u.produk.map(function(p){ return p.id; }),14,2);
  saveDB();
  showToast(status==='terverifikasi'?'UMKM disetujui dan kini tampil di direktori.':'UMKM ditolak.',status==='terverifikasi'?'success':'error');
  renderAdminDashboard();
}

function deleteUmkm(id){
  if(!confirm('Hapus UMKM ini beserta produk dan ulasannya? Tindakan ini tidak bisa dibatalkan.')) return;
  DB.umkm=DB.umkm.filter(function(u){ return u.id!==id; });
  DB.ratings=DB.ratings.filter(function(r){ return r.umkmId!==id; });
  saveDB(); showToast('UMKM dihapus.','success'); renderAdminDashboard();
}

function deleteProduk(produkId){
  var u=currentOwnerUmkm(); if(!u) return;
  if(!confirm('Hapus produk ini?')) return;
  u.produk=u.produk.filter(function(p){ return p.id!==produkId; });
  u.transaksi=u.transaksi.filter(function(t){ return t.produkId!==produkId; });
  saveDB(); showToast('Produk dihapus.','success'); renderOwnerDashboard();
}

function catatPenjualan(produkId){
  var u=currentOwnerUmkm(); if(!u) return;
  var qtyEl=document.getElementById('qty-'+produkId);
  var qty=parseInt(qtyEl.value,10);
  if(!qty||qty<1){ showToast('Jumlah tidak valid.','error'); return; }
  u.transaksi.push({id:uid('tx'),tanggal:isoDateOnly(new Date()),produkId:produkId,jumlah:qty});
  saveDB(); showToast('Penjualan dicatat.','success'); renderOwnerDashboard();
}

/* =============================================================
   16. SCROLL ANIMATIONS & VISUAL ENHANCEMENTS
   ============================================================= */
function initNavbarScroll(){
  var navbar=document.querySelector('.navbar');
  window.addEventListener('scroll',function(){ navbar.classList.toggle('scrolled',window.scrollY>10); },{passive:true});
}

function initScrollReveal(){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){ if(entry.isIntersecting){ entry.target.classList.add('visible'); io.unobserve(entry.target); } });
  },{threshold:0.12});

  function observeTargets(){
    document.querySelectorAll('.section-head,.umkm-card,.stat-card,.chart-card,.panel').forEach(function(el){
      if(!el.classList.contains('anim-fade-up')){ el.classList.add('anim-fade-up'); io.observe(el); }
    });
    var stepsEl=document.querySelector('.steps');
    if(stepsEl&&!stepsEl.classList.contains('anim-stagger')){
      stepsEl.classList.add('anim-stagger');
      var sIo=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){ if(entry.isIntersecting){ entry.target.classList.add('visible'); sIo.unobserve(entry.target); } });
      },{threshold:0.15});
      sIo.observe(stepsEl);
    }
    ['hero-side','cta-band'].forEach(function(cls){
      var el=document.querySelector('.'+cls);
      if(el&&!el.classList.contains('anim-fade-up')){ el.classList.add('anim-fade-up'); io.observe(el); }
    });
  }

  observeTargets();
  var origRD=window._origRenderDirectory||renderDirectory;
  window._origRenderDirectory=origRD;
  renderDirectory=function(){ origRD.apply(this,arguments); setTimeout(observeTargets,40); };
}

function initHeroParallax(){
  var pattern=document.querySelector('.hero-pattern');
  if(!pattern) return;
  window.addEventListener('scroll',function(){ pattern.style.transform='translateY('+(window.scrollY*0.18)+'px)'; },{passive:true});
}

function animateCounter(el,target,duration){
  var start=null;
  function step(ts){
    if(!start) start=ts;
    var p=Math.min((ts-start)/duration,1), ease=1-Math.pow(1-p,3);
    el.textContent=Math.round(target*ease);
    if(p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initHeroStatCounters(){
  var statsEl=document.getElementById('hero-stats');
  if(!statsEl) return;
  var observed=false;
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting&&!observed){
        observed=true;
        statsEl.querySelectorAll('b').forEach(function(b){ var v=parseInt(b.textContent,10); if(!isNaN(v)) animateCounter(b,v,900); });
        io.unobserve(entry.target);
      }
    });
  },{threshold:0.5});
  io.observe(statsEl);
  var origRHS=renderHeroStats;
  renderHeroStats=function(){ origRHS.apply(this,arguments); observed=false; io.observe(statsEl); };
}

function initRipple(){
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.btn');
    if(!btn) return;
    var rect=btn.getBoundingClientRect();
    var size=Math.max(rect.width,rect.height)*1.4;
    var ripple=document.createElement('span');
    ripple.className='btn-ripple';
    ripple.style.cssText='width:'+size+'px;height:'+size+'px;left:'+(e.clientX-rect.left-size/2)+'px;top:'+(e.clientY-rect.top-size/2)+'px;';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend',function(){ ripple.remove(); });
  });
}

/* =============================================================
   17. PASSWORD TOGGLE
   ============================================================= */
function initPasswordToggle(){
  var eyeOpen='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var eyeOff ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-pw-toggle]');
    if(!btn) return;
    var input=document.getElementById(btn.dataset.pwToggle);
    if(!input) return;
    var showing=input.type==='text';
    input.type=showing?'password':'text';
    btn.innerHTML=showing?eyeOpen:eyeOff;
    btn.setAttribute('aria-label',showing?'Tampilkan kata sandi':'Sembunyikan kata sandi');
  });
}

/* =============================================================
   18. DARK MODE  —  circular reveal (transform:scale) from toggle origin
   ============================================================= */
function initDarkMode(){
  var btn   = document.getElementById('theme-toggle');
  var track = btn.querySelector('.theme-toggle-track');
  var wipe  = document.getElementById('theme-wipe');
  var circle = wipe.querySelector('.wipe-circle');
  var saved = localStorage.getItem('BizIn_theme');

  // Apply saved or system preference
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(saved === 'dark' || (!saved && prefersDark)) document.body.classList.add('dark');

  // Keep wipe layer background in sync so it shows the NEW theme colour
  function syncWipeBg(){
    var goingDark = !document.body.classList.contains('dark'); // about to toggle TO dark
    circle.style.background = goingDark
      ? 'linear-gradient(135deg, #0D1824 60%, #141E28)'
      : 'linear-gradient(135deg, #F4F1E4 60%, #ECE7D4)';
  }

  btn.addEventListener('click', function(e){
    var rect   = btn.getBoundingClientRect();
    var xPct   = ((rect.left + rect.width  / 2) / window.innerWidth  * 100).toFixed(2) + '%';
    var yPct   = ((rect.top  + rect.height / 2) / window.innerHeight * 100).toFixed(2) + '%';

    syncWipeBg();
    wipe.style.setProperty('--wx', xPct);
    wipe.style.setProperty('--wy', yPct);

    // Little pulse ring on the switch itself, for tactile feedback at the origin
    track.classList.remove('pulse');
    void track.offsetWidth; // force reflow so the animation can re-fire
    track.classList.add('pulse');

    // Reset wipe animation so it can re-fire
    wipe.classList.remove('wipe-active');
    void circle.offsetWidth;               // force reflow
    wipe.classList.add('wipe-active');

    // Toggle theme once the circle has covered enough of the screen to hide the switch
    // (tuned to the new, slightly longer .68s duration)
    setTimeout(function(){
      document.body.classList.toggle('dark');
      localStorage.setItem('BizIn_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    }, 190);

    // Clean up after animation
    wipe.addEventListener('animationend', function handler(){
      wipe.classList.remove('wipe-active');
      wipe.removeEventListener('animationend', handler);
    });
  });
}

/* =============================================================
   19. INIT
   ============================================================= */
async function init(){
  await initDB();
  wireEvents();
  renderNavAuthArea();
  navigateTo('home');
  initNavbarScroll();
  initHeroParallax();
  initRipple();
  initPasswordToggle();
  initDarkMode();
  setTimeout(function(){
    initScrollReveal();
    initHeroStatCounters();
  }, 60);
}
document.addEventListener('DOMContentLoaded', init);
