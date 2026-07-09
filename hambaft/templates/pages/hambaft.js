frappe.pages['hambaft'].on_page_load = function (wrapper) {
    frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Hambaft',
        single_column: true,
    });

    $(wrapper).find('.layout-main-section').html('<div id="root" class="h-full"></div>');

    const ensureAsset = (tagName, attributes) => {
        const selector = Object.entries(attributes)
            .map(([key, value]) => `[${key}="${value}"]`)
            .join('');

        if (document.head.querySelector(`${tagName}${selector}`)) {
            return;
        }

        const node = document.createElement(tagName);
        Object.entries(attributes).forEach(([key, value]) => {
            node.setAttribute(key, value);
        });
        document.head.appendChild(node);
    };

    ensureAsset('link', {
        rel: 'stylesheet',
        href: '/assets/hambaft/assets/index.css',
    });

    if (!window.__hambaftDeskScriptLoaded) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = '/assets/hambaft/assets/index.js';
        document.body.appendChild(script);
        window.__hambaftDeskScriptLoaded = true;
    }
};

frappe.pages['hambaft'].on_page_show = function () {
    // React root is reused by the frontend bundle.
};
