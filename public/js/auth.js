const loginBtn = document.getElementById('loginBtn');
const errorBanner = document.getElementById('errorBanner');
const errorText = document.getElementById('errorText');
const idWrapper = document.getElementById('idWrapper');
const pwWrapper = document.getElementById('pwWrapper');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

function togglePasswordVisibility() {
    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
}

function clearErrors() {
    errorBanner.classList.remove('visible');
    idWrapper.classList.remove('error');
    pwWrapper.classList.remove('error');
}

usernameInput.addEventListener('input', clearErrors);
passwordInput.addEventListener('input', clearErrors);

async function handleLoginSubmit(e) {
    e.preventDefault();
    clearErrors();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showError('Please enter both Coordinator ID and Password');
        if (!username) idWrapper.classList.add('error');
        if (!password) pwWrapper.classList.add('error');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Authenticating...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            showError(data.message || 'Authentication failed');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In to Dashboard';
            return;
        }

        // Store JWT token and domain category
        localStorage.setItem('admonitio_token', data.token);
        localStorage.setItem('coordinator_data', JSON.stringify(data.coordinator));

        showToast('Login Successful! Redirecting...');
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 800);

    } catch (err) {
        console.error('Server error:', err);
        showError('Could not connect to server. Please try again.');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In to Dashboard';
    }
}

function showError(msg) {
    errorText.textContent = msg;
    errorBanner.classList.add('visible');
}

function showToast(text) {
    const toast = document.getElementById('toastBox');
    document.getElementById('toastText').textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}