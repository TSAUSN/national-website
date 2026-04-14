document.addEventListener("DOMContentLoaded", () => {
	const elem = document.getElementById('datepicker');
    if(elem) {
        const datepicker = new Datepicker(elem, {
            format: 'MMMM yyyy',
            autohide: false,
            showDaysOfWeek: true,
            weekStart: 0,
            daysOfWeekHighlighted: [0, 6],
            todayHighlight: true,
            updateOnBlur: false,
            maxView: 1,
            defaultViewDate: '', // Use current date
            prevArrow: '&lt;',
            nextArrow: '&gt;',
        });
    
        // Set the date to current date
        // datepicker.setDate(new Date());
    
        // Set today to current date
        const today = new Date();
        datepicker.picker.element.querySelector('.today')?.classList.remove('today');
        const todayCell = Array.from(datepicker.picker.element.querySelectorAll('.datepicker-cell'))
            .find(cell => cell.dataset.date === today.toISOString().split('T')[0]);
        if (todayCell) todayCell.classList.add('today');
    }
});
