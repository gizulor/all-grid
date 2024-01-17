let visiblity = 'invisible';

// Create new IntersectionObserver
const io = new IntersectionObserver(entries => {

  // Available data when an intersection happens
  console.log(entries);

  // Element enters the viewport
  if(entries[0].intersectionRatio !== 0) {
    visiblity = 'visible';

  // Element leaves the viewport
  } else {
    visiblity = 'invisible';
  }

  updateStatus(visiblity);
});

// Element to be observed
const menu = document.querySelector('.io-sentinal');

// Start observing .box
io.observe(menu);


// Just necessary for displaying the current status
function updateStatus(visiblity) {
  console.log(visiblity);

  const status = document.querySelector('.status');
  status.textContent = visiblity;
  status.className = 'status status--' + visiblity;
  $logo = $('.m_logo');
  if(visiblity == 'visible') {
    //logo.classList.remove('m_logo--min','m_logo--max');
    $logo.removeClass('m_logo--max');
    $logo.addClass('m_logo--min');
    $('.l_sidebar__menu').addClass('l_sidebar__menu--fixed');
  } else {
    $logo.removeClass('m_logo--min');
    $logo.addClass('m_logo--max');
    //logo.classList.remove('m_logo--min','m_logo--max');
    //logo.className += ' m_logo--max';
  }
}