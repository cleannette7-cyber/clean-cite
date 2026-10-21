/* Collecte de provenance volontairement limitée aux paramètres de campagne (pas de cookies). */
(function(){
  function init(){
    const qs=new URLSearchParams(window.location.search);
    const fields=['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
    document.querySelectorAll('form[data-netlify="true"]').forEach(function(form){
      fields.forEach(function(key){
        let node=form.querySelector('input[name="'+key+'"]');
        if(!node){node=document.createElement('input');node.type='hidden';node.name=key;form.appendChild(node);}
        const val=qs.get(key);
        if(val)node.value=val.slice(0,180);
      });
      const path=form.querySelector('input[name="page_origine"]');
      if(path&&!path.value) path.value=location.pathname;
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
