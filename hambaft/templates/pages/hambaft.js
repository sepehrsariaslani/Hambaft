frappe.pages['hambaft'].on_page_load = function (wrapper) {
    frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Hambaft',
        single_column: true,
    });

    $(wrapper).find('.layout-main-section').html('<div id="root" class="h-full"></div>');

    // Dynamically load assets from the Vite-generated index.html.
    // We always fetch a fresh copy and check if the inline content has changed
    // compared to what's currently loaded, so deploys are picked up without
    // requiring a hard refresh or closing the tab.
    const cacheBust = '_t=' + Date.now();
    fetch('/assets/hambaft/index.html?' + cacheBust)
        .then(r => {
            if (!r.ok) throw new Error('index.html fetch failed: ' + r.status);
            return r.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Check if inline assets already loaded with the same content
            const existingInline = document.querySelector('script[data-hambaft-inline="app"]');
            const newInline = doc.querySelector('script[data-hambaft-inline="app"]');

            if (existingInline && newInline) {
                const existingHash = existingInline.textContent.length;
                const newHash = newInline.textContent.length;
                // If the inline script is roughly the same size, skip reload
                if (Math.abs(existingHash - newHash) < 100) {
                    return;
                }
                // Content changed — remove old assets and reload
                document.querySelectorAll('[data-hambaft-inline="app"]').forEach(el => el.remove());
            } else if (existingInline && !newInline) {
                // Old inline mode, new is external — remove inline
                document.querySelectorAll('[data-hambaft-inline="app"]').forEach(el => el.remove());
            }

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
