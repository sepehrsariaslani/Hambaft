frappe.pages['hambaft'].on_page_load = function (wrapper) {
    frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Hambaft',
        single_column: true,
    });

    $(wrapper).find('.layout-main-section').html('<div id="root" class="h-full"></div>');

    // Dynamically load assets from the Vite-generated index.html so hashed filenames work.
    // Frappe serves {app}/public/ at /assets/{app}/, so hambaft/public/index.html
    // is available at /assets/hambaft/index.html.
    if (window.__hambaftAssetsLoaded) return;
    window.__hambaftAssetsLoaded = true;

    // Cache-bust the index.html fetch so we always get the latest hashed asset paths.
    const cacheBust = '_t=' + Date.now();
    fetch('/assets/hambaft/index.html?' + cacheBust)
        .then(r => {
            if (!r.ok) throw new Error('index.html fetch failed: ' + r.status);
            return r.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Inject modulepreload links for faster chunk loading
            doc.querySelectorAll('link[rel="modulepreload"]').forEach(link => {
                const href = link.getAttribute('href');
                if (!href || document.querySelector(`link[href="${href}"]`)) return;
                const node = document.createElement('link');
                node.rel = 'modulepreload';
                node.href = href;
                if (link.crossOrigin) node.crossOrigin = link.crossOrigin;
                document.head.appendChild(node);
            });

            doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                if (document.querySelector(`link[href="${link.getAttribute('href')}"]`)) return;
                const node = document.createElement('link');
                node.rel = 'stylesheet';
                node.href = link.getAttribute('href');
                if (link.crossOrigin) node.crossOrigin = link.crossOrigin;
                document.head.appendChild(node);
            });

            doc.querySelectorAll('style[data-hambaft-inline="app"]').forEach(style => {
                if (document.querySelector('style[data-hambaft-inline="app"]')) return;
                const node = document.createElement('style');
                node.setAttribute('data-hambaft-inline', 'app');
                node.textContent = style.textContent || '';
                document.head.appendChild(node);
            });

            doc.querySelectorAll('script[type="module"]').forEach(script => {
                const src = script.getAttribute('src');
                const node = document.createElement('script');
                node.type = 'module';
                if (src) {
                    if (document.querySelector(`script[src="${src}"]`)) return;
                    node.src = src;
                    if (script.crossOrigin) node.crossOrigin = script.crossOrigin;
                } else {
                    if (document.querySelector('script[data-hambaft-inline="app"]')) return;
                    node.setAttribute('data-hambaft-inline', 'app');
                    node.textContent = script.textContent || '';
                }
                document.body.appendChild(node);
            });
        })
        .catch(err => {
            console.error('[hambaft] failed to load assets from index.html:', err);
        });
};

frappe.pages['hambaft'].on_page_show = function () {
    // React root is reused by the frontend bundle.
};
