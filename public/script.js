let currentStep = 1;
let selectedShipping = 'standard';
let selectedPayment = 'credit';
let addressFilled = false;
let pixTimer = null;

window.checkoutData = {};

const CREDIT_CARD_FEE_PERCENTAGE = 50;
const BACKEND_API_BASE_URL = '/api/payments';

let cartData = {
    subtotal: 299.90
};

document.addEventListener('DOMContentLoaded', function() {
    parseSubtotalFromURL();
    setupEventListeners();
    updateProgress();
    setupMasks();
    updateCartDisplay();
    
    const creditCardNotice = document.getElementById('creditCardNotice');
    if (creditCardNotice) {
        creditCardNotice.style.display = 'none';
    }
});

function parseSubtotalFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const subtotalParam = urlParams.get('subtotal');
    if (subtotalParam) {
        try {
            cartData.subtotal = parseFloat(subtotalParam);
        } catch (error) {
            console.error('Error parsing subtotal:', error);
        }
    }
}

function updateCartDisplay() {
    updateOrderTotals();
}

function updateOrderTotals() {
    const subtotalEl = document.querySelector(".sidebar .total-row span:last-child");
    const mobileSubtotalEl = document.querySelector("#summaryContent .total-row span:nth-child(2)");
    
    if (subtotalEl) subtotalEl.textContent = `R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}`;
    if (mobileSubtotalEl) mobileSubtotalEl.textContent = `R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}`;
    
    const mobileTotalPrice = document.getElementById("mobileTotalPrice");
    if (mobileTotalPrice) mobileTotalPrice.textContent = `R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}`;
    
    updateShippingCost();
}

function setupEventListeners() {
    document.getElementById('contactForm').addEventListener('submit', handleContactSubmit);
    document.getElementById('shippingForm').addEventListener('submit', handleShippingSubmit);
    document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);

    document.querySelectorAll('.shipping-option').forEach(option => {
        option.addEventListener('click', selectShipping);
    });

    document.querySelectorAll('.payment-method').forEach(method => {
        method.querySelector('.payment-header').addEventListener('click', selectPayment);
    });

    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) validateField(input);
        });
    });

    document.getElementById('zipCode').addEventListener('keyup', handleCEPLookup);
}

function toggleOrderSummary() {
    const toggle = document.querySelector('.summary-toggle');
    const content = document.getElementById('summaryContent');
    const icon = document.querySelector('.summary-toggle-icon');
    
    toggle.classList.toggle('expanded');
    content.classList.toggle('expanded');
    
    if (toggle.classList.contains('expanded')) {
        icon.textContent = '▲';
        document.querySelector('.summary-toggle-text').textContent = 'Ocultar resumo do pedido';
    } else {
        icon.textContent = '▼';
        document.querySelector('.summary-toggle-text').textContent = 'Exibir resumo do pedido';
    }
}

async function handleCEPLookup() {
    const cepInput = document.getElementById('zipCode');
    const cep = cepInput.value.replace(/\D/g, '');
    
    if (cep.length === 8) {
        showCEPLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                fillAddressFields(data);
                showAddressFields();
                showShippingOptions();
                document.getElementById('zipCodeError').classList.remove('show');
                cepInput.classList.remove('error');
            } else {
                showCEPError();
            }
        } catch (error) {
            showCEPError();
        } finally {
            showCEPLoading(false);
        }
    } else {
        hideAddressFields();
        hideShippingOptions();
    }
}

function showCEPLoading(show) {
    const loading = document.getElementById('cepLoading');
    if (show) loading.classList.add('show');
    else loading.classList.remove('show');
}

function fillAddressFields(data) {
    document.getElementById('address').value = data.logradouro;
    document.getElementById('neighborhood').value = data.bairro;
    document.getElementById('city').value = data.localidade;
    document.getElementById('state').value = data.uf;
    document.getElementById('number').focus();
    addressFilled = true;
}

function showAddressFields() { document.getElementById('addressFields').classList.add('show'); }
function hideAddressFields() { document.getElementById('addressFields').classList.remove('show'); addressFilled = false; }
function showShippingOptions() { document.getElementById('shippingOptions').classList.add('show'); }
function hideShippingOptions() { document.getElementById('shippingOptions').classList.remove('show'); }

function showCEPError() {
    const zipCodeInput = document.getElementById('zipCode');
    const errorEl = document.getElementById('zipCodeError');
    zipCodeInput.classList.add('error');
    errorEl.textContent = 'CEP não encontrado. Verifique e tente novamente.';
    errorEl.classList.add('show');
    hideAddressFields();
    hideShippingOptions();
}

function setupMasks() {
    document.getElementById('cpf').addEventListener('input', e => e.target.value = applyCPFMask(e.target.value));
    document.getElementById('phone').addEventListener('input', e => e.target.value = applyPhoneMask(e.target.value));
    document.getElementById('zipCode').addEventListener('input', e => e.target.value = applyZipMask(e.target.value));
    document.getElementById('cardNumber').addEventListener('input', e => e.target.value = applyCardMask(e.target.value));
    document.getElementById('cardExpiry').addEventListener('input', e => e.target.value = applyExpiryMask(e.target.value));
    document.getElementById('cardCvv').addEventListener('input', e => e.target.value = e.target.value.replace(/\D/g, ''));
}

function applyCPFMask(v) { return v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
function applyPhoneMask(v) { return v.replace(/\D/g, '').replace(/^(\d\d)(\d)/g, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'); }
function applyZipMask(v) { return v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2'); }
function applyCardMask(v) { return v.replace(/\D/g, '').replace(/(\d{4})(\d)/, '$1 $2').replace(/(\d{4})(\d)/, '$1 $2').replace(/(\d{4})(\d)/, '$1 $2'); }
function applyExpiryMask(v) { return v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1/$2'); }

function goToStep(step) {
    if (step < currentStep || validateCurrentStep()) {
        currentStep = step;
        updateStepDisplay();
        updateProgress();
        if (currentStep === 3) updateShippingCost();
        if (window.innerWidth < 768) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateStepDisplay() {
    document.querySelectorAll('.step-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`step${currentStep}`).classList.add('active');
}

function updateProgress() {
    const steps = document.querySelectorAll('.step');
    const progressLine = document.getElementById('progressLine');
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.querySelector('.step-circle').innerHTML = '✓';
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.querySelector('.step-circle').innerHTML = stepNumber;
        } else {
            step.querySelector('.step-circle').innerHTML = stepNumber;
        }
    });
    const progressWidth = ((currentStep - 1) / (steps.length - 1)) * 100;
    if (progressLine) progressLine.style.width = progressWidth + '%';
}

function validateCurrentStep() {
    const currentStepEl = document.getElementById(`step${currentStep}`);
    const inputs = currentStepEl.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!validateField(input)) isValid = false;
    });

    // Validação específica para a etapa de Frete (agora etapa 1)
    if (currentStep === 1 && !addressFilled) {
        isValid = false;
        const zipCodeInput = document.getElementById('zipCode');
        if (!zipCodeInput.classList.contains('error')) {
            zipCodeInput.classList.add('error');
            document.getElementById('zipCodeError').textContent = 'Digite um CEP válido para continuar';
            document.getElementById('zipCodeError').classList.add('show');
        }
    }

    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';

    field.classList.remove('error', 'success');
    const errorEl = document.getElementById(fieldName + 'Error');
    if (errorEl) errorEl.classList.remove('show');

    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = "Este campo é obrigatório";
    } else if (value) {
        switch (fieldName) {
            case "email": if (!validateEmail(value)) { isValid = false; errorMessage = "Digite um e-mail válido"; } break;
            case "cpf": if (!validateCPF(value)) { isValid = false; errorMessage = "Digite um CPF válido"; } break;
            case "phone": if (!validatePhone(value)) { isValid = false; errorMessage = "Digite um telefone válido"; } break;
            case "zipCode": if (!validateZipCode(value)) { isValid = false; errorMessage = "Digite um CEP válido"; } break;
            case "cardNumber": if (!validateCardNumber(value)) { isValid = false; errorMessage = "Digite um número de cartão válido"; } break;
            case "cardExpiry": if (!validateCardExpiry(value)) { isValid = false; errorMessage = "Digite uma data válida"; } break;
            case "cardCvv": if (value.length < 3) { isValid = false; errorMessage = "Digite um CVV válido"; } break;
        }
    }

    if (isValid) field.classList.add("success");
    else {
        field.classList.add("error");
        if (errorEl) { errorEl.textContent = errorMessage; errorEl.classList.add("show"); }
    }
    return isValid;
}

function validateEmail(email) { return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email); }
function validateCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    return true;
}
function validatePhone(phone) { return /^\(\d{2}\) \d{5}-\d{4}$/.test(phone); }
function validateZipCode(zipCode) { return /^\d{5}-\d{3}$/.test(zipCode); }
function validateCardNumber(cardNumber) { const clean = cardNumber.replace(/\s/g, ''); return clean.length >= 13 && clean.length <= 19; }
function validateCardExpiry(expiry) {
    const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!regex.test(expiry)) return false;
    const [month, year] = expiry.split('/');
    const now = new Date();
    const curYear = now.getFullYear() % 100;
    const curMonth = now.getMonth() + 1;
    const cardYear = parseInt(year);
    const cardMonth = parseInt(month);
    return !(cardYear < curYear || (cardYear === currentYear && cardMonth < currentMonth));
}

// MODIFICADO: Agora Shipping é a Etapa 1
async function handleShippingSubmit(e) {
    e.preventDefault();
    if (validateCurrentStep()) {
        const formData = new FormData(e.target);
        const shippingData = {
            zipCode: formData.get('zipCode'),
            address: formData.get('address'),
            number: formData.get('number'),
            complement: formData.get('complement'),
            neighborhood: formData.get('neighborhood'),
            city: formData.get('city'),
            state: formData.get('state'),
            shippingMethod: selectedShipping
        };
        window.checkoutData = { ...window.checkoutData, ...shippingData };
        goToStep(2); // Vai para Contato
    }
}

// MODIFICADO: Agora Contact é a Etapa 2
async function handleContactSubmit(e) {
    e.preventDefault();
    if (validateCurrentStep()) {
        const formData = new FormData(e.target);
        const contactData = {
            email: formData.get('email'),
            firstName: formData.get('firstName'),
            cpf: formData.get('cpf'),
            phone: formData.get('phone')
        };
        window.checkoutData = { ...window.checkoutData, ...contactData };
        goToStep(3); // Vai para Pagamento
    }
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.classList.add('btn-loading');
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    try {
        const orderData = {
            ...window.checkoutData,
            paymentMethod: selectedPayment,
            subtotal: cartData.subtotal,
            shippingCost: getShippingCost(),
            total: calculateTotal()
        };

        if (selectedPayment === 'pix') await processPixPayment(orderData);
        else if (selectedPayment === 'credit') await processCreditCardPayment(orderData, e.target);
        else if (selectedPayment === 'boleto') await processBoletoPayment(orderData);
    } catch (error) {
        alert(error.message || 'Erro ao finalizar pedido.');
    } finally {
        submitBtn.classList.remove('btn-loading');
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

async function processPixPayment(orderData) {
    const pixData = {
        paymentMethod: 'PIX',
        amount: Math.round(orderData.total * 100),
        customer: {
            name: orderData.firstName,
            email: orderData.email,
            phone: orderData.phone.replace(/\D/g, ''),
            document: { number: orderData.cpf.replace(/\D/g, ''), type: 'CPF' }
        },
        items: [{ title: 'Pedido Loja Online', quantity: 1, price: Math.round(orderData.total * 100) }],
        pix: { expiresIn: 3600 }
    };

    try {
        const response = await fetch(`${BACKEND_API_BASE_URL}/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pixData)
        });
        const result = await response.json();
        if (response.ok) showPixPaymentDetails(result);
        else throw new Error(result.error || result.message || 'Erro na API');
    } catch (error) {
        alert(error.message);
    }
}

function showPixPaymentDetails(paymentResult) {
    const pixPaymentDetails = document.getElementById('pixPaymentDetails');
    const pixCodeText = document.getElementById('pixCodeText');
    pixPaymentDetails.style.display = 'block';
    if (paymentResult.pix && paymentResult.pix.qrcode) {
        pixCodeText.textContent = paymentResult.pix.qrcode;
        const submitButton = document.getElementById('paymentForm').querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Já Paguei';
            submitButton.style.backgroundColor = '#10b981';
            submitButton.type = 'button';
            submitButton.onclick = () => window.location.href = 'https://seusite.com/confirmacao';
        }
    }
    startPixTimer(900);
}

function startPixTimer(seconds) {
    const timerElement = document.getElementById('pixTimeRemaining');
    let timeLeft = seconds;
    if (pixTimer) clearInterval(pixTimer);
    pixTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) { clearInterval(pixTimer); timerElement.textContent = 'Expirado'; }
        timeLeft--;
    }, 1000);
}

function copyPixCode() {
    const text = document.getElementById('pixCodeText').textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('pixCopyButton');
        btn.textContent = 'Copiado!';
        setTimeout(() => btn.textContent = 'Copiar Código PIX', 2000);
    });
}

async function processCreditCardPayment(orderData, form) {
    const formData = new FormData(form);
    const cardData = {
        paymentMethod: 'CARD',
        amount: Math.round(orderData.total * 100),
        installments: parseInt(formData.get('installments')),
        customer: { name: orderData.firstName, email: orderData.email, document: orderData.cpf.replace(/\D/g, ''), phone: orderData.phone.replace(/\D/g, '') },
        card: {
            number: formData.get('cardNumber').replace(/\s/g, ''),
            holderName: formData.get('cardName'),
            expiryMonth: formData.get('cardExpiry').split('/')[0],
            expiryYear: '20' + formData.get('cardExpiry').split('/')[1],
            cvv: formData.get('cardCvv')
        },
        shipping: { address: orderData.address, number: orderData.number, complement: orderData.complement || '', neighborhood: orderData.neighborhood, city: orderData.city, state: orderData.state, zipCode: orderData.zipCode.replace(/\D/g, '') },
        items: [{ name: 'Produto', quantity: 1, price: Math.round(orderData.total * 100) }],
        description: 'Pedido da loja online',
        ip: '127.0.0.1'
    };

    try {
        const response = await fetch(`${BACKEND_API_BASE_URL}/credit-card`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cardData)
        });
        const result = await response.json();
        if (response.ok) {
            if (result.status === 'approved' || result.status === 'pending') showSuccessNotification('Pedido finalizado com sucesso!');
            else throw new Error('Pagamento rejeitado.');
        } else throw new Error(result.message || 'Erro ao processar pagamento');
    } catch (error) {
        if (error.message.includes('fetch')) showSuccessNotification('Pagamento simulado aprovado!');
        else throw error;
    }
}

async function processBoletoPayment(orderData) {
    showSuccessNotification('Boleto gerado com sucesso!');
}

function showSuccessNotification(message) {
    const notification = document.getElementById('successNotification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 5000);
}

function getShippingCost() {
    switch (selectedShipping) {
        case 'express': return 15.90;
        case 'same-day': return 29.90;
        default: return 0;
    }
}

function calculateTotal() {
    let total = cartData.subtotal + getShippingCost();
    if (selectedPayment === 'credit') total = total * 1.50; // 50% de acréscimo
    return total;
}

function selectShipping() {
    document.querySelectorAll('.shipping-option').forEach(option => option.classList.remove('selected'));
    this.classList.add('selected');
    selectedShipping = this.dataset.shipping;
    updateShippingCost();
}

function updateShippingCost() {
    const shippingCostEl = document.getElementById('shippingCost');
    const mobileShippingCostEl = document.getElementById('mobileShippingCost');
    const totalPriceEl = document.getElementById('totalPrice');
    const mobileTotalPriceEl = document.getElementById('mobileTotalPrice');
    const mobileFinalPriceEl = document.getElementById('mobileFinalPrice');
    
    let shippingCost = getShippingCost();
    let shippingText = shippingCost === 0 ? 'GRÁTIS' : `R$ ${shippingCost.toFixed(2).replace('.', ',')}`;

    let total = cartData.subtotal + shippingCost;
    let creditCardFee = 0;
    
    if (selectedPayment === 'credit' && currentStep === 3) {
        creditCardFee = total * (CREDIT_CARD_FEE_PERCENTAGE / 100);
        total = total + creditCardFee;
        document.getElementById('creditCardFeeRow').style.display = 'flex';
        document.getElementById('mobileCreditCardFeeRow').style.display = 'flex';
        const feeFormatted = `+R$ ${creditCardFee.toFixed(2).replace('.', ',')}`;
        document.getElementById('creditCardFee').textContent = feeFormatted;
        document.getElementById('mobileCreditCardFee').textContent = feeFormatted;
        updateCreditCardValues(total);
        document.getElementById('creditCardNotice').style.display = 'block';
    } else {
        document.getElementById('creditCardFeeRow').style.display = 'none';
        document.getElementById('mobileCreditCardFeeRow').style.display = 'none';
        if (document.getElementById('creditCardNotice')) document.getElementById('creditCardNotice').style.display = 'none';
    }
    
    updatePaymentMethodValues(total - creditCardFee);
    const totalFormatted = `R$ ${total.toFixed(2).replace('.', ',')}`;
    if (shippingCostEl) shippingCostEl.textContent = shippingText;
    if (mobileShippingCostEl) mobileShippingCostEl.textContent = shippingText;
    if (totalPriceEl) totalPriceEl.textContent = totalFormatted;
    if (mobileTotalPriceEl) mobileTotalPriceEl.textContent = totalFormatted;
    if (mobileFinalPriceEl) mobileFinalPriceEl.textContent = totalFormatted;
}

function updateCreditCardValues(totalWithFee) {
    const el = document.getElementById('creditCardTotalValue');
    if (el) el.textContent = `R$ ${totalWithFee.toFixed(2).replace('.', ',')}`;
    updateInstallmentOptions(totalWithFee);
}

function updatePaymentMethodValues(baseTotal) {
    const pixVal = document.getElementById('pixValue');
    const boletoVal = document.getElementById('boletoValue');
    const formatted = `R$ ${baseTotal.toFixed(2).replace('.', ',')}`;
    if (pixVal) pixVal.textContent = formatted;
    if (boletoVal) boletoVal.textContent = formatted;
}

function updateInstallmentOptions(total) {
    const select = document.getElementById('installments');
    if (!select) return;
    while (select.children.length > 0) select.removeChild(select.lastChild);
    for (let i = 1; i <= 12; i++) {
        let val = i <= 6 ? total / i : (total * (1 + (i-6)*0.03)) / i;
        let text = `${i}x R$ ${val.toFixed(2).replace('.', ',')} ${i <= 6 ? 'sem juros' : 'com juros'}`;
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = text;
        select.appendChild(opt);
    }
}

function selectPayment() {
    document.querySelectorAll(".payment-method").forEach(m => m.classList.remove("selected"));
    this.parentElement.classList.add("selected");
    selectedPayment = this.parentElement.dataset.payment;
    const fields = ["cardNumber", "cardName", "cardExpiry", "cardCvv", "installments"];
    fields.forEach(id => {
        const f = document.getElementById(id);
        if (f) {
            if (selectedPayment === "credit") f.setAttribute("required", "");
            else {
                f.removeAttribute("required");
                f.classList.remove("error", "success");
                const err = document.getElementById(id + "Error");
                if (err) err.classList.remove("show");
            }
        }
    });
    updateShippingCost();
}

function applyCoupon() {
    const input = document.getElementById('discountInput');
    if (input.value.trim().toUpperCase() === 'DESCONTO10') showSuccessNotification('Cupom aplicado! 10% de desconto');
    else if (input.value) alert('Cupom inválido');
}
