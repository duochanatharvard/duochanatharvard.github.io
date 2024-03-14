document.addEventListener('DOMContentLoaded', function() {

  const container = document.querySelector('.container');
  const edges = container.querySelectorAll('.edge');

  const totalHeight = document.documentElement.scrollHeight; // Total scrollable height
  const viewportHeight = window.innerHeight; // Height of the viewport
  const maxScrollable = totalHeight - viewportHeight;

  const percentagePoints = [10, 20, 30, 40]; // Percentages for trigger points
  const triggerPoints = percentagePoints.map(percentage => percentage * maxScrollable / 100);
  const newEdgesThreshold = 60 * maxScrollable / 100; // Threshold for new edges
  const changeContainerThreshold = 70 * maxScrollable / 100; // Threshold for moving containers

  let currentScrollPosition = 0;
  let lastScrollPosition = 0;
  let ticking = false;
  let allEdgesVisible = false;

  // ---------------------------------------------------------------------------
  function resetContainerPosition() {
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
  }

  function changeContainerPosition(scrollPos) {
    container.style.position = 'absolute';
    container.style.top = `${scrollPos + (window.innerHeight / 2 - container.offsetHeight / 2)}px`;
    container.style.left = `50%`;
    container.style.transform = 'translateX(-50%)';
  }

  function checkEdgesVisibility(scrollPos) {
    allEdgesVisible = scrollPos > changeContainerThreshold
    if (!allEdgesVisible && container.style.position === 'absolute') {
      resetContainerPosition();
    } else if (allEdgesVisible) {
      if (container.style.position !== 'absolute') {
        changeContainerPosition(scrollPos);
      }
    }
  }

  // ---------------------------------------------------------------------------
  function make_new_edge_visible(container, baseClass, numberOfEdges) {
    const existingEdges = container.querySelectorAll(`.${baseClass}`);
    if (existingEdges.length === 0) {
      // Edges not yet created, so create them
      for (let i = 1; i <= numberOfEdges; i++) {
        const newEdge = document.createElement('div');
        newEdge.classList.add('edge', baseClass, `${baseClass}-${i}`);
        container.appendChild(newEdge);
        // Delay to ensure CSS transition occurs
        setTimeout(() => newEdge.classList.add('visible'), 100);
      }
    } else {
      // Edges already exist, transition them back before removing
      existingEdges.forEach(edge => edge.style.visibility = 'visible');
    }
  }

  function reverse_new_edge_visible(container, baseClass){
    const newEdges = container.querySelectorAll(`.${baseClass}`);
    newEdges.forEach(edge => {
      edge.classList.remove('visible'); // This will move them back to the start
      edge.addEventListener('transitionend', function() {
        edge.remove(); // Removes the element from the DOM after the transition has finished
      }, { once: true }); // Option to ensure the event listener is removed after it fires once
    });
  }

  // ---------------------------------------------------------------------------
  function handleScroll(scrollPos) {

    const currentScrollPosition = window.scrollY || document.documentElement.scrollTop;
    const scrollDown = currentScrollPosition > lastScrollPosition;

    edges.forEach((edge, index) => {
      if (scrollPos > triggerPoints[index]) {
        edge.style.opacity = '1';
      } else {
        edge.style.opacity = '0';
      }
    });

    if (scrollDown && currentScrollPosition > newEdgesThreshold) {
      const numberOfEdges = 8;
      make_new_edge_visible(container, "new-left-edge", numberOfEdges);
      make_new_edge_visible(container, "new-top-edge", numberOfEdges);
    } else if (!scrollDown && currentScrollPosition < newEdgesThreshold) {
      reverse_new_edge_visible(container, 'new-left-edge');
      reverse_new_edge_visible(container, 'new-top-edge');
    }

    lastScrollPosition = currentScrollPosition; // Update last scroll position

    // Control texts
    const textBox = document.getElementById('textBox');
    const textIn  = 10 * maxScrollable / 100;
    const textOut = 50 * maxScrollable / 100;
    if (currentScrollPosition > textIn && currentScrollPosition < textOut) {
      textBox.style.opacity = '1';
    } else {
      textBox.style.opacity = '0';
    }

    checkEdgesVisibility(scrollPos);
  }

  window.addEventListener('scroll', function() {
    currentScrollPosition = window.scrollY || document.documentElement.scrollTop;

    if (!ticking) {
      window.requestAnimationFrame(function() {
        handleScroll(currentScrollPosition);
        ticking = false;
      });

      ticking = true;
    }
  });
});
