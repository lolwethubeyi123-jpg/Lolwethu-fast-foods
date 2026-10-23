/* ==========================================================
   forms.js - Part 3
   Shared validation + submission logic for:
     - enquiry.html  (#enquiryForm)  -> cost/availability estimate
     - contact.html  (#contactForm)  -> compiled email
   Fields opt in to validation with data-rule="..."
   Each field needs a <small id="{fieldId}Error"> next to it.
   ========================================================== */
(function () {
    'use strict';

    // ---------- Settings (change these to suit the business) ----------
    var CONFIG = {
        RECIPIENT: 'lolwethubeyi123@gmail.com',
        // AJAX: paste a Formspree / Netlify form endpoint here to send in the background.
        // e.g. 'https://formspree.io/f/yourFormId'. Leave empty to use the built-in fallbacks.
        AJAX_ENDPOINT: '',
        DELIVERY_FEE: 20,
        BULK_MIN_QTY: 10,
        BULK_DISCOUNT: 0.10,
        BASE_PREP_MINUTES: 10,
        EXTRA_MINUTES_PER_MEAL: 2,
        // Must match the Opening Hours on the Contact page
        HOURS_WEEKDAY: { open: 10, close: 21 },  // Monday - Saturday
        HOURS_SUNDAY: { open: 11, close: 20 }
    };

    // ---------- Validation rules: return '' when valid, otherwise the error message ----------
    var RULES = {
        name: function (v) {
            return /^[\p{L}][\p{L}\s'.\-]+$/u.test(v) && v.length <= 60
                ? '' : 'Please enter your full name (letters only, at least 2 characters).';
        },
        phone: function (v) {
            var clean = v.replace(/[\s\-()]/g, '');
            return /^(\+27|0)[1-9][0-9]{8}$/.test(clean)
                ? '' : 'Enter a valid South African number, e.g. 082 123 4567.';
        },
        email: function (v) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
                ? '' : 'Please enter a valid email address.';
        },
        select: function (v, field) {
            return v !== '' ? '' : (field.getAttribute('data-error') || 'Please choose an option.');
        },
        quantity: function (v) {
            var n = parseInt(v, 10);
            return (!isNaN(n) && n >= 1 && n <= 50 && String(n) === v.trim())
                ? '' : 'Quantity must be a whole number between 1 and 50.';
        },
        message: function (v) {
            if (v.length < 10) { return 'Please write at least 10 characters.'; }
            if (v.length > 1000) { return 'Please keep your message under 1000 characters.'; }
            return '';
        }
    };

    // ---------- Helpers ----------
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function errorBox(field) {
        return document.getElementById(field.id + 'Error');
    }

    function validateField(field) {
        var rule = RULES[field.getAttribute('data-rule')];
        var message = rule ? rule(field.value.trim(), field) : '';
        var box = errorBox(field);
        if (box) { box.textContent = message; }
        field.setAttribute('aria-invalid', message ? 'true' : 'false');
        return message === '';
    }

    function validateAll(fields) {
        var firstInvalid = null;
        fields.forEach(function (field) {
            if (!validateField(field) && !firstInvalid) { firstInvalid = field; }
        });
        if (firstInvalid) { firstInvalid.focus(); }
        return firstInvalid === null;
    }

    // Wires validation to a form: on blur, live re-check after an error, and on submit
    function initForm(form, onValid) {
        var fields = Array.prototype.slice.call(form.querySelectorAll('[data-rule]'));

        fields.forEach(function (field) {
            if (errorBox(field)) { field.setAttribute('aria-describedby', field.id + 'Error'); }
            field.addEventListener('blur', function () { validateField(field); });
            var liveEvent = field.tagName === 'SELECT' ? 'change' : 'input';
            field.addEventListener(liveEvent, function () {
                if (field.getAttribute('aria-invalid') === 'true') { validateField(field); }
            });
        });

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            if (validateAll(fields)) { onValid(); }
        });
    }

    // AJAX submission with fetch(). Resolves { skipped: true } when no endpoint is configured.
    function sendAjax(form) {
        if (!CONFIG.AJAX_ENDPOINT) { return Promise.resolve({ skipped: true }); }
        return fetch(CONFIG.AJAX_ENDPOINT, {
            method: 'POST',
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
        }).then(function (response) {
            if (!response.ok) { throw new Error('Request failed: ' + response.status); }
            return { sent: true };
        });
    }

    function showBox(box, html) {
        box.innerHTML = html;
        box.style.display = 'block';
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---------- Enquiry page ----------
    var enquiryForm = document.getElementById('enquiryForm');
    if (enquiryForm) {
        var enquiryBox = document.getElementById('enquiryResponse');
        var enquiryBtn = enquiryForm.querySelector('button[type="submit"]');

        var buildEstimate = function (status) {
            var select = document.getElementById('meal');
            var option = select.options[select.selectedIndex];
            var price = parseFloat(option.getAttribute('data-price'));
            var quantity = parseInt(document.getElementById('quantity').value, 10);
            var service = document.getElementById('service').value;
            var name = document.getElementById('name').value.trim();
            var email = document.getElementById('email').value.trim();

            var subtotal = price * quantity;
            var discount = quantity >= CONFIG.BULK_MIN_QTY ? subtotal * CONFIG.BULK_DISCOUNT : 0;
            var delivery = service === 'delivery' ? CONFIG.DELIVERY_FEE : 0;
            var total = subtotal - discount + delivery;
            var prepMinutes = CONFIG.BASE_PREP_MINUTES + quantity * CONFIG.EXTRA_MINUTES_PER_MEAL;

            var now = new Date();
            var hours = now.getDay() === 0 ? CONFIG.HOURS_SUNDAY : CONFIG.HOURS_WEEKDAY;
            var isOpen = now.getHours() >= hours.open && now.getHours() < hours.close;
            var availability = isOpen
                ? 'We are open now (until ' + hours.close + ':00 today) and your order would be ready in about ' + prepMinutes + ' minutes.'
                : 'We are currently closed. Our hours are Monday to Saturday 10:00 to 21:00 and Sunday 11:00 to 20:00. Your order would take about ' + prepMinutes + ' minutes once we open.';

            var statusLine = {
                sent: 'Your enquiry has been sent to our team. We will reply at ' + escapeHtml(email) + '.',
                skipped: 'We will reply to your enquiry at ' + escapeHtml(email) + ' as soon as possible.',
                failed: 'We could not send your enquiry automatically. Please use our Contact page or call us on 078 260 0902.'
            }[status];

            showBox(enquiryBox,
                '<h3>Thank you, ' + escapeHtml(name) + '!</h3>' +
                '<p>Here is the estimate for your enquiry:</p>' +
                '<ul>' +
                '<li>' + quantity + ' x ' + escapeHtml(option.text) + ' at R' + price.toFixed(2) + ' each = <strong>R' + subtotal.toFixed(2) + '</strong></li>' +
                (discount > 0 ? '<li>Bulk discount (' + (CONFIG.BULK_DISCOUNT * 100) + '%): <strong>-R' + discount.toFixed(2) + '</strong></li>' : '') +
                '<li>' + (delivery > 0 ? 'Delivery fee: <strong>R' + delivery.toFixed(2) + '</strong>' : 'Collection: <strong>free</strong>') + '</li>' +
                '<li>Estimated total: <strong>R' + total.toFixed(2) + '</strong></li>' +
                '</ul>' +
                '<p><strong>Availability:</strong> ' + availability + '</p>' +
                '<p>' + statusLine + '</p>');
        };

        initForm(enquiryForm, function () {
            enquiryBox.style.display = 'none';
            enquiryBtn.disabled = true;
            sendAjax(enquiryForm)
                .then(function (result) { buildEstimate(result.sent ? 'sent' : 'skipped'); })
                .catch(function () { buildEstimate('failed'); })
                .then(function () { enquiryBtn.disabled = false; });
        });
    }

    // ---------- Contact page ----------
    var contactForm = document.getElementById('contactForm');
    if (contactForm) {
        var preview = document.getElementById('emailPreview');
        var contactBtn = contactForm.querySelector('button[type="submit"]');

        var showEmail = function (note) {
            var name = document.getElementById('contactName').value.trim();
            var email = document.getElementById('contactEmail').value.trim();
            var phone = document.getElementById('contactPhone').value.trim();
            var type = document.getElementById('contactType').value;
            var message = document.getElementById('contactMessage').value.trim();

            var subject = type + ' from ' + name;
            var body = "Hello Lolwethu's Fast Food Kitchen,\n\n" +
                message + '\n\n' +
                '--- Contact details ---\n' +
                'Name: ' + name + '\n' +
                'Email: ' + email + '\n' +
                'Phone: ' + phone + '\n' +
                'Message type: ' + type;

            var mailto = 'mailto:' + CONFIG.RECIPIENT +
                '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(body);

            showBox(preview,
                '<h3>Your email is ready</h3>' +
                (note ? '<p>' + note + '</p>' : '') +
                '<p><strong>To:</strong> ' + escapeHtml(CONFIG.RECIPIENT) + '</p>' +
                '<p><strong>Subject:</strong> ' + escapeHtml(subject) + '</p>' +
                '<p class="email-body"><strong>Message:</strong>\n' + escapeHtml(body) + '</p>' +
                '<a class="btn-link" href="' + mailto + '">Send Email</a>' +
                '<p>Clicking the button opens your email app with everything filled in. Press send there to deliver it.</p>');
        };

        initForm(contactForm, function () {
            preview.style.display = 'none';
            contactBtn.disabled = true;
            sendAjax(contactForm)
                .then(function (result) {
                    if (result.sent) {
                        showBox(preview,
                            '<h3>Message sent</h3>' +
                            '<p>Thank you, ' + escapeHtml(document.getElementById('contactName').value.trim()) +
                            '. We have received your message and will reply by email soon.</p>');
                    } else {
                        showEmail('');
                    }
                })
                .catch(function () {
                    showEmail('We could not send your message automatically, so please send it from your email app.');
                })
                .then(function () { contactBtn.disabled = false; });
        });
    }
})();