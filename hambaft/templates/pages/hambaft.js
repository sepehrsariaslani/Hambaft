frappe.pages['hambaft'].on_page_load = function (wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Hambaft',
        single_column: true,
    });
    $(wrapper).find('.layout-main-section').html('<div id="app" class="h-full"></div>');
    // Load Vue app
    frappe.require('hambaft.bundle.js', () => {
        // Vue app mounted by bundle
    });
};

frappe.pages['hambaft'].on_page_show = function () {
    // Re-mount if needed
};
