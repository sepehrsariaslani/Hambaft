frappe.pages['hambaft'].on_page_load = function (wrapper) {
    frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Hambaft',
        single_column: true,
    });

    $(wrapper).find('.layout-main-section').html('<div id="root" class="h-full"></div>');

    // Always load fresh assets on page load.
    // We use a unique timestamp to bust all caches.
    const cacheBust = '_v=' + Date.now();
    fetch('/assets/hambaft/index.html?' + cacheBust)
        .then(r => {
            if (!r.ok) throw new Error('index.html fetch failed: ' + r.status);
            return r.text();
        })
        .then(html => {
            // First, remove any previously loaded hambaft assets
            // so a fresh deploy always takes effect.
            document.querySelectorAll('[data-hambaft-inline="app"]').forEach(el => el.remove());
            document.querySelectorAll('link[data-hambaft-asset]').forEach(el => el.remove());
            document.querySelectorAll('script[data-hambaft-asset]').forEach(el => el.remove());

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Inject stylesheets
            doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                const node = document.createElement('link');
                node.rel = 'stylesheet';
                node.href = link.getAttribute('href');
                node.setAttribute('data-hambaft-asset', '1');
                if (link.crossOrigin) node.crossOrigin = link.crossOrigin;
                document.head.appendChild(node);
            });

            // Inject inline styles
            doc.querySelectorAll('style[data-hambaft-inline="app"]').forEach(style => {
                const node = document.createElement('style');
                node.setAttribute('data-hambaft-inline', 'app');
                node.textContent = style.textContent || '';
                document.head.appendChild(node);
            });

            // Inject modulepreload links
            doc.querySelectorAll('link[rel="modulepreload"]').forEach(link => {
                const href = link.getAttribute('href');
                if (!href || document.querySelector(`link[href="${href}"]`)) return;
                const node = document.createElement('link');
                node.rel = 'modulepreload';
                node.href = href;
                if (link.crossOrigin) node.crossOrigin = link.crossOrigin;
                document.head.appendChild(node);
            });

            // Inject scripts
            doc.querySelectorAll('script[type="module"]').forEach(script => {
                const src = script.getAttribute('src');
                const node = document.createElement('script');
                node.type = 'module';
                if (src) {
                    node.src = src;
                    node.setAttribute('data-hambaft-asset', '1');
                    if (script.crossOrigin) node.crossOrigin = script.crossOrigin;
                } else {
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
