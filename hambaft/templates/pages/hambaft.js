frappe.pages['hambaft'].on_page_load = function (wrapper) {
    frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Hambaft',
        single_column: true,
    });

    $(wrapper).find('.layout-main-section').html('<div id="root" class="h-full"></div>');

    // Dynamically load assets from the Vite-generated index.html so hashed filenames work
    if (window.__hambaftAssetsLoaded) return;
    window.__hambaftAssetsLoaded = true;

    fetch('/assets/hambaft/frontend/index.html')
        .then(r => r.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                if (document.querySelector(`link[href="${link.getAttribute('href')}"]`)) return;
                const node = document.createElement('link');
                node.rel = 'stylesheet';
                node.href = link.getAttribute('href');
                if (link.crossOrigin) node.crossOrigin = link.crossOrigin;
                document.head.appendChild(node);
            });

            doc.querySelectorAll('script[type="module"]').forEach(script => {
                const src = script.getAttribute('src');
                if (!src || document.querySelector(`script[src="${src}"]`)) return;
                const node = document.createElement('script');
                node.type = 'module';
                node.src = src;
                if (script.crossOrigin) node.crossOrigin = script.crossOrigin;
                document.body.appendChild(node);
            });
        })
        .catch(err => {
            console.error('[hambaft] failed to load assets', err);
            // Fallback to stable paths (if build used stable filenames)
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/assets/hambaft/frontend/assets/index.css';
            document.head.appendChild(link);
            const script = document.createElement('script');
            script.type = 'module';
            script.src = '/assets/hambaft/frontend/assets/index.js';
            document.body.appendChild(script);
        });
};

frappe.pages['hambaft'].on_page_show = function () {
    // React root is reused by the frontend bundle.
};
