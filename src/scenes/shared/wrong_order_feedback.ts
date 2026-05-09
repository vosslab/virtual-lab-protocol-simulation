//============================================
// wrong_order_feedback.ts
// Toast notification for wrong order interactions
//============================================

//============================================
// showWrongOrderToast(message: string): void
// Display a transient warning toast in the fixed top-right corner.
// The toast auto-dismisses after 2 seconds with a fade-out animation.
// Uses a shared DOM container (wrong-order-toast-container) to avoid
// creating multiple containers across different scenes.
//============================================
function showWrongOrderToast(message: string): void {
	let toastContainer = document.getElementById('wrong-order-toast-container');
	if (!toastContainer) {
		toastContainer = document.createElement('div');
		toastContainer.id = 'wrong-order-toast-container';
		toastContainer.style.position = 'fixed';
		toastContainer.style.top = '20px';
		toastContainer.style.right = '20px';
		toastContainer.style.zIndex = '1000';
		toastContainer.style.pointerEvents = 'none';
		document.body.appendChild(toastContainer);
	}

	// Remove any existing toast
	const existingToast = toastContainer.querySelector('.wrong-order-toast');
	if (existingToast) {
		toastContainer.removeChild(existingToast);
	}

	// Create new toast
	const toast = document.createElement('div');
	toast.className = 'wrong-order-toast';
	toast.textContent = message;
	toast.style.backgroundColor = '#fff3cd';
	toast.style.border = '1px solid #ffc107';
	toast.style.borderRadius = '6px';
	toast.style.padding = '12px 16px';
	toast.style.fontSize = '14px';
	toast.style.fontWeight = '500';
	toast.style.color = '#856404';
	toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
	toast.style.maxWidth = '300px';
	toast.style.wordWrap = 'break-word';
	toast.style.animation = 'fadeIn 0.3s ease-in';

	toastContainer.appendChild(toast);

	// Auto-dismiss after 2 seconds
	setTimeout(() => {
		if (toastContainer && toastContainer.contains(toast)) {
			toast.style.animation = 'fadeOut 0.3s ease-out';
			setTimeout(() => {
				if (toastContainer && toastContainer.contains(toast)) {
					toastContainer.removeChild(toast);
				}
			}, 300);
		}
	}, 2000);
}

export { showWrongOrderToast };
