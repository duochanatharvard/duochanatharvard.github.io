const modeButtons = document.querySelectorAll(".mode-btn");
const rho = 1025;
const cp = 3990;
const secondsPerYear = 365.25 * 24 * 60 * 60;
const fluxArrowReference = 4;
const boxColorReference = 7.5;
// Time-axis handles: defaults, ECS tolerance, search cap, and tick animation speed.
const baseModelYears = {
  one: 100,
  two: 300,
};
const equilibriumTolerance = 0.01;
const equilibriumSearchMaxYear = 2000;
const xAxisAnimationMs = 650;
const yAxisAnimationMs = 520;
const yTickStep = 2.5;
const minimumYAxisMagnitude = 7.5;
const oneElements = document.querySelectorAll("#oneFormula, #oneBoxDiagram");
const twoElements = document.querySelectorAll(".two-control, #twoFormula, #twoBoxDiagram");
const playButton = document.getElementById("playButton");
const timeSlider = document.getElementById("timeSlider");
const timeValue = document.getElementById("timeValue");
const forcingSignButton = document.getElementById("forcingSignButton");
const temperatureCanvas = document.getElementById("temperatureChart");
const temperatureCtx = temperatureCanvas.getContext("2d");
const fluxCanvas = document.getElementById("fluxChart");
const fluxCtx = fluxCanvas.getContext("2d");
const temperatureLegend = document.getElementById("temperatureLegend");
const fluxLegend = document.getElementById("fluxLegend");

const controls = {
  forcing: document.getElementById("forcing"),
  feedback: document.getElementById("feedback"),
  mixedDepth: document.getElementById("mixedDepth"),
  deepDepth: document.getElementById("deepDepth"),
  exchange: document.getElementById("exchange"),
};

const outputs = {
  forcing: document.getElementById("forcingValue"),
  feedback: document.getElementById("feedbackValue"),
  mixedDepth: document.getElementById("mixedDepthValue"),
  deepDepth: document.getElementById("deepDepthValue"),
  exchange: document.getElementById("exchangeValue"),
};

const mixedDepthSymbol = document.getElementById("mixedDepthSymbol");
const mixedDepthLabelText = document.getElementById("mixedDepthLabelText");

const diagram = {
  oneSurface: document.getElementById("oneSurfaceBox"),
  oneTitle: document.getElementById("oneBoxTitle"),
  oneDepthLabel: document.getElementById("oneBoxDepthLabel"),
  oneDepthArrowTop: document.getElementById("oneDepthArrowTop"),
  oneDepthArrowBottom: document.getElementById("oneDepthArrowBottom"),
  oneTemp: document.getElementById("oneTempLabel"),
  oneForcingLabel: document.getElementById("oneForcingLabel"),
  oneFeedbackLabel: document.getElementById("oneFeedbackLabel"),
  oneForcingArrow: document.getElementById("oneForcingArrow"),
  oneFeedbackArrow: document.getElementById("oneFeedbackArrow"),
  mixedLayer: document.getElementById("mixedLayerBox"),
  deepOcean: document.getElementById("deepOceanBox"),
  mixedTitle: document.getElementById("mixedBoxTitle"),
  mixedDepthLabel: document.getElementById("mixedBoxDepthLabel"),
  mixedDepthArrowTop: document.getElementById("mixedDepthArrowTop"),
  mixedDepthArrowBottom: document.getElementById("mixedDepthArrowBottom"),
  deepTitle: document.getElementById("deepBoxTitle"),
  deepDepthLabel: document.getElementById("deepBoxDepthLabel"),
  deepDepthArrowTop: document.getElementById("deepDepthArrowTop"),
  deepDepthArrowBottom: document.getElementById("deepDepthArrowBottom"),
  mixedTemp: document.getElementById("mixedTempLabel"),
  deepTemp: document.getElementById("deepTempLabel"),
  exchangeLabel: document.getElementById("exchangeLabel"),
  forcingLabel: document.getElementById("forcingLabel"),
  feedbackLabel: document.getElementById("feedbackLabel"),
  forcingArrow: document.getElementById("forcingArrow"),
  feedbackArrow: document.getElementById("feedbackArrow"),
  exchangeArrow: document.getElementById("exchangeArrow"),
  redMarker: document.getElementById("arrowRed"),
  blueMarker: document.getElementById("arrowBlue"),
  tealMarker: document.getElementById("arrowTeal"),
};

let mode = "one";
let points = [];
let isPlaying = false;
let animationId = null;
let xAxisAnimationId = null;
let lastFrameTime = null;
let forcingSign = 1;
let xAxisMaxYear = baseModelYears.one;
let displayedXAxisMaxYear = xAxisMaxYear;
let xAxisTickYears = [];
let xAxisPreviousTickYears = [];
let xAxisAnimationProgress = 1;
let xAxisAnimationStart = null;
let xAxisAnimationFrom = xAxisMaxYear;
let xAxisAnimationTo = xAxisMaxYear;
const yAxisStates = {
  temperature: {
    targetMin: null,
    targetMax: null,
    displayedMin: null,
    displayedMax: null,
    startMin: null,
    startMax: null,
    tickValues: [],
    previousTickValues: [],
    animationId: null,
    animationStart: null,
    animationProgress: 1,
  },
  flux: {
    targetMin: null,
    targetMax: null,
    displayedMin: null,
    displayedMax: null,
    startMin: null,
    startMax: null,
    tickValues: [],
    previousTickValues: [],
    animationId: null,
    animationStart: null,
    animationProgress: 1,
  },
};

function value(id) {
  return Number(controls[id].value);
}

function forcingValue() {
  return forcingSign * value("forcing");
}

function currentMaxYear() {
  return xAxisMaxYear;
}

function xTickStepForMaxYear(maxYear) {
  if (maxYear <= 150) return 25;
  if (maxYear <= 500) return 100;
  if (maxYear <= 1500) return 250;
  return 500;
}

function xAxisConfigForMaxYear(rawMaxYear) {
  let step = xTickStepForMaxYear(rawMaxYear);
  let maxYear = Math.ceil(rawMaxYear / step) * step;
  const adjustedStep = xTickStepForMaxYear(maxYear);

  if (adjustedStep !== step) {
    step = adjustedStep;
    maxYear = Math.ceil(rawMaxYear / step) * step;
  }

  const ticks = [];
  for (let tick = 0; tick <= maxYear; tick += step) {
    ticks.push(tick);
  }

  return { maxYear, ticks };
}

function makeXAxisTicks(maxYear) {
  return xAxisConfigForMaxYear(maxYear).ticks;
}

function formatYearTick(year) {
  return String(Math.round(year));
}

function makeYAxisTicks(yMin, yMax) {
  const ticks = [];
  const topTick = Math.ceil(yMax / yTickStep) * yTickStep;
  const bottomTick = Math.floor(yMin / yTickStep) * yTickStep;

  for (let tick = topTick; tick >= bottomTick - yTickStep * 0.01; tick -= yTickStep) {
    if (tick <= yMax + yTickStep * 0.01 && tick >= yMin - yTickStep * 0.01) {
      ticks.push(Math.abs(tick) < 1e-9 ? 0 : tick);
    }
  }

  return ticks;
}

function formatYAxisTick(tick) {
  const cleanTick = Math.abs(tick) < 1e-9 ? 0 : tick;
  return Number.isInteger(cleanTick) ? String(cleanTick) : cleanTick.toFixed(1);
}

function steppedYAxisRange(minValue, maxValue) {
  if (forcingSign < 0) {
    const magnitude = Math.max(minimumYAxisMagnitude, Math.ceil(Math.abs(minValue) / yTickStep) * yTickStep);
    return { yMin: -magnitude, yMax: 0 };
  }

  const magnitude = Math.max(minimumYAxisMagnitude, Math.ceil(maxValue / yTickStep) * yTickStep);
  return { yMin: 0, yMax: magnitude };
}

function easeOutCubic(ratio) {
  return 1 - (1 - ratio) ** 3;
}

function animateXAxis(timestamp) {
  if (xAxisAnimationStart === null) xAxisAnimationStart = timestamp;
  const progress = Math.min(1, (timestamp - xAxisAnimationStart) / xAxisAnimationMs);
  xAxisAnimationProgress = progress;
  displayedXAxisMaxYear = xAxisAnimationFrom + (xAxisAnimationTo - xAxisAnimationFrom) * easeOutCubic(progress);
  render();

  if (progress < 1) {
    xAxisAnimationId = requestAnimationFrame(animateXAxis);
    return;
  }

  displayedXAxisMaxYear = xAxisAnimationTo;
  xAxisAnimationProgress = 1;
  xAxisPreviousTickYears = [];
  xAxisAnimationId = null;
  xAxisAnimationStart = null;
  render();
}

function setXAxisMaxYear(nextMaxYear, animate = true) {
  const nextAxisConfig = xAxisConfigForMaxYear(Math.max(1, nextMaxYear));
  const roundedNextMaxYear = nextAxisConfig.maxYear;
  if (xAxisMaxYear === roundedNextMaxYear && xAxisTickYears.length) return;

  xAxisMaxYear = roundedNextMaxYear;
  xAxisPreviousTickYears = xAxisTickYears.length ? xAxisTickYears : makeXAxisTicks(displayedXAxisMaxYear);
  xAxisTickYears = nextAxisConfig.ticks;

  if (xAxisAnimationId) {
    cancelAnimationFrame(xAxisAnimationId);
    xAxisAnimationId = null;
  }

  if (!animate) {
    displayedXAxisMaxYear = xAxisMaxYear;
    xAxisPreviousTickYears = [];
    xAxisAnimationProgress = 1;
    xAxisAnimationStart = null;
    return;
  }

  xAxisAnimationFrom = displayedXAxisMaxYear;
  xAxisAnimationTo = xAxisMaxYear;
  xAxisAnimationProgress = 0;
  xAxisAnimationStart = null;
  xAxisAnimationId = requestAnimationFrame(animateXAxis);
}

function animateYAxis(key, timestamp) {
  const state = yAxisStates[key];
  if (state.animationStart === null) state.animationStart = timestamp;
  const progress = Math.min(1, (timestamp - state.animationStart) / yAxisAnimationMs);
  const eased = easeOutCubic(progress);

  state.animationProgress = progress;
  state.displayedMin = state.startMin + (state.targetMin - state.startMin) * eased;
  state.displayedMax = state.startMax + (state.targetMax - state.startMax) * eased;
  render();

  if (progress < 1) {
    state.animationId = requestAnimationFrame((nextTimestamp) => animateYAxis(key, nextTimestamp));
    return;
  }

  state.displayedMin = state.targetMin;
  state.displayedMax = state.targetMax;
  state.previousTickValues = [];
  state.animationProgress = 1;
  state.animationId = null;
  state.animationStart = null;
  render();
}

function setYAxisRange(key, nextMin, nextMax, animate = true) {
  const state = yAxisStates[key];
  const rangeChanged =
    state.targetMin === null ||
    Math.abs(state.targetMin - nextMin) > 0.001 ||
    Math.abs(state.targetMax - nextMax) > 0.001;

  if (!rangeChanged) return;

  state.targetMin = nextMin;
  state.targetMax = nextMax;
  state.previousTickValues = state.tickValues.length
    ? state.tickValues
    : makeYAxisTicks(state.displayedMin ?? nextMin, state.displayedMax ?? nextMax);
  state.tickValues = makeYAxisTicks(nextMin, nextMax);

  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }

  if (state.displayedMin === null || state.displayedMax === null || !animate) {
    state.displayedMin = nextMin;
    state.displayedMax = nextMax;
    state.previousTickValues = [];
    state.animationProgress = 1;
    state.animationStart = null;
    return;
  }

  state.startMin = state.displayedMin;
  state.startMax = state.displayedMax;
  state.animationProgress = 0;
  state.animationStart = null;
  state.animationId = requestAnimationFrame((timestamp) => animateYAxis(key, timestamp));
}

function updateForcingSignButton() {
  forcingSignButton.textContent = forcingSign < 0 ? "−" : "+";
  forcingSignButton.classList.toggle("is-negative", forcingSign < 0);
  forcingSignButton.setAttribute("aria-pressed", String(forcingSign < 0));
}

function setHidden(elements, hidden) {
  elements.forEach((element) => {
    if (hidden) element.setAttribute("hidden", "");
    else element.removeAttribute("hidden");
  });
}

function depthToHeatCapacityYears(depth) {
  return (rho * cp * depth) / secondsPerYear;
}

function oneBoxResponse(years = baseModelYears.one) {
  const forcing = forcingValue();
  const feedback = value("feedback");
  const heatCapacity = depthToHeatCapacityYears(value("mixedDepth"));
  const dt = 0.25;
  let surface = 0;
  const response = [{ year: 0, surface }];

  for (let t = dt; t <= years; t += dt) {
    surface += ((forcing - feedback * surface) / heatCapacity) * dt;
    if (Math.abs(t - Math.round(t)) < dt / 2) {
      response.push({ year: Math.round(t), surface });
    }
  }

  return response;
}

function twoBoxResponse(years = baseModelYears.two) {
  const forcing = forcingValue();
  const feedback = value("feedback");
  const mixedCapacity = depthToHeatCapacityYears(value("mixedDepth"));
  const deepCapacity = depthToHeatCapacityYears(value("deepDepth"));
  const exchange = value("exchange");
  const dt = 0.25;
  let surface = 0;
  let deep = 0;
  const response = [{ year: 0, surface, deep }];

  for (let t = dt; t <= years; t += dt) {
    const uptake = exchange * (surface - deep);
    surface += ((forcing - feedback * surface - uptake) / mixedCapacity) * dt;
    deep += (uptake / deepCapacity) * dt;

    if (Math.abs(t - Math.round(t)) < dt / 2) {
      response.push({ year: Math.round(t), surface, deep });
    }
  }

  return response;
}

function equilibriumTargetYear(response, ecs) {
  if (!Number.isFinite(ecs)) return null;
  const targetPoint = response.find((point) => Math.abs(point.surface - ecs) <= equilibriumTolerance);
  return targetPoint ? targetPoint.year : null;
}

function computeResponse() {
  const baseYears = baseModelYears[mode];
  const searchYears = Math.max(baseYears, equilibriumSearchMaxYear);
  const response = mode === "two" ? twoBoxResponse(searchYears) : oneBoxResponse(searchYears);
  const ecs = forcingValue() / value("feedback");
  const equilibriumYear = equilibriumTargetYear(response, ecs);
  const rawMaxYear = Math.max(baseYears, equilibriumYear ?? equilibriumSearchMaxYear);
  const maxYear = xAxisConfigForMaxYear(rawMaxYear).maxYear;

  return {
    points: response.filter((point) => point.year <= maxYear),
    maxYear,
  };
}

function getPoint(year) {
  return points[Math.min(Math.max(Math.round(year), 0), points.length - 1)];
}

function setFluxArrow(arrow, marker, flux, referenceFlux) {
  const ratio = Math.min(1, Math.abs(flux) / referenceFlux);
  const width = 2.4 + 11 * ratio;
  const markerSize = 9 + 12 * ratio;
  arrow.style.strokeWidth = width.toFixed(2);
  arrow.style.opacity = "1";
  marker.setAttribute("markerWidth", markerSize.toFixed(1));
  marker.setAttribute("markerHeight", markerSize.toFixed(1));
}

function mixColor(from, to, ratio) {
  const mixed = from.map((channel, index) => Math.round(channel + (to[index] - channel) * ratio));
  return `rgb(${mixed.join(", ")})`;
}

function boxFillForTemperature(temperature, baseColor) {
  const ratio = Math.min(1, Math.abs(temperature) / boxColorReference);
  const warmColor = [244, 177, 170];
  const coldColor = [177, 203, 242];
  return mixColor(baseColor, temperature >= 0 ? warmColor : coldColor, ratio);
}

function scale(valueToScale, minInput, maxInput, minOutput, maxOutput) {
  const ratio = (valueToScale - minInput) / (maxInput - minInput);
  return minOutput + Math.min(1, Math.max(0, ratio)) * (maxOutput - minOutput);
}

function setTextPosition(element, x, y) {
  element.setAttribute("x", x.toFixed(1));
  element.setAttribute("y", y.toFixed(1));
}

function setDepthDimension(label, topArrow, bottomArrow, x, topY, bottomY) {
  const centerY = (topY + bottomY) / 2;
  const labelGap = Math.min(25, Math.max(18, (bottomY - topY) * 0.2));
  setTextPosition(label, x, centerY);
  topArrow.setAttribute("d", `M${x.toFixed(1)} ${(centerY - labelGap).toFixed(1)} L${x.toFixed(1)} ${topY.toFixed(1)}`);
  bottomArrow.setAttribute("d", `M${x.toFixed(1)} ${(centerY + labelGap).toFixed(1)} L${x.toFixed(1)} ${bottomY.toFixed(1)}`);
}

function setSubscriptTemperature(element, subscript, value) {
  const namespace = "http://www.w3.org/2000/svg";
  const tspan = document.createElementNS(namespace, "tspan");
  tspan.setAttribute("baseline-shift", "sub");
  tspan.setAttribute("font-size", "18");
  tspan.textContent = subscript;

  element.textContent = "";
  element.append("T");
  element.append(tspan);
  element.append(`′ = ${value.toFixed(2)} K`);
}

function updateModeParameterLabels() {
  if (mode === "two") {
    mixedDepthSymbol.innerHTML = "D<sub>s</sub>";
    mixedDepthLabelText.textContent = "surface box depth";
  } else {
    mixedDepthSymbol.textContent = "D";
    mixedDepthLabelText.textContent = "box depth";
  }
}

function updateOneBoxGeometry() {
  const depth = value("mixedDepth");
  const boxHeight = scale(depth, 5, 200, 60, 165);
  const boxY = 285;
  const boxCenterX = 155 + 410 / 2;
  const arrowOffset = 56;
  const forcingX = boxCenterX - arrowOffset;
  const feedbackX = boxCenterX + arrowOffset;
  const arrowLength = 134;
  const arrowStartY = boxY - 10 - arrowLength;

  diagram.oneSurface.setAttribute("y", boxY.toFixed(1));
  diagram.oneSurface.setAttribute("height", boxHeight.toFixed(1));
  setTextPosition(diagram.oneTitle, 190, boxY + boxHeight * 0.5);
  setDepthDimension(diagram.oneDepthLabel, diagram.oneDepthArrowTop, diagram.oneDepthArrowBottom, 118, boxY, boxY + boxHeight);
  setTextPosition(diagram.oneTemp, 385, boxY + boxHeight * 0.5);
  setTextPosition(diagram.oneForcingLabel, forcingX - 54, arrowStartY + 20);
  setTextPosition(diagram.oneFeedbackLabel, feedbackX + 34, arrowStartY + 20);
  diagram.oneForcingArrow.dataset.positivePath = `M${forcingX} ${arrowStartY.toFixed(1)} L${forcingX} ${(boxY - 10).toFixed(1)}`;
  diagram.oneForcingArrow.dataset.negativePath = `M${forcingX} ${(boxY - 10).toFixed(1)} L${forcingX} ${arrowStartY.toFixed(1)}`;
  diagram.oneFeedbackArrow.dataset.positivePath = `M${feedbackX} ${boxY.toFixed(1)} L${feedbackX} ${(boxY - arrowLength).toFixed(1)}`;
  diagram.oneFeedbackArrow.dataset.negativePath = `M${feedbackX} ${(boxY - arrowLength).toFixed(1)} L${feedbackX} ${boxY.toFixed(1)}`;
}

function updateTwoBoxGeometry() {
  const mixedDepth = value("mixedDepth");
  const deepDepth = value("deepDepth");
  const mixedHeight = scale(mixedDepth, 5, 200, 58, 125);
  const deepHeight = scale(deepDepth, 200, 4000, 88, 185);
  const totalHeight = mixedHeight + deepHeight;
  const topY = 145 + (250 - totalHeight) * 0.5;
  const deepY = topY + mixedHeight;
  const exchangeY1 = deepY - 10;
  const exchangeY2 = deepY + 15;
  const boxCenterX = 126 + 468 / 2;
  const arrowOffset = 58;
  const forcingX = boxCenterX - arrowOffset;
  const feedbackX = boxCenterX + arrowOffset;
  const exchangeX = 440;
  const arrowLength = 82;
  const arrowStartY = topY - 10 - arrowLength;

  diagram.mixedLayer.setAttribute("y", topY.toFixed(1));
  diagram.mixedLayer.setAttribute("height", mixedHeight.toFixed(1));
  diagram.deepOcean.setAttribute("y", deepY.toFixed(1));
  diagram.deepOcean.setAttribute("height", deepHeight.toFixed(1));

  setTextPosition(diagram.mixedTitle, 154, topY + mixedHeight * 0.5);
  setDepthDimension(diagram.mixedDepthLabel, diagram.mixedDepthArrowTop, diagram.mixedDepthArrowBottom, 94, topY, deepY);
  setTextPosition(diagram.mixedTemp, 420, topY + mixedHeight * 0.5);
  setTextPosition(diagram.deepTitle, 154, deepY + deepHeight * 0.5);
  setDepthDimension(diagram.deepDepthLabel, diagram.deepDepthArrowTop, diagram.deepDepthArrowBottom, 94, deepY, deepY + deepHeight);
  setTextPosition(diagram.deepTemp, 420, deepY + deepHeight * 0.5);
  setTextPosition(diagram.exchangeLabel, boxCenterX - 60, deepY + 6);
  setTextPosition(diagram.forcingLabel, forcingX - 54, arrowStartY + 20);
  setTextPosition(diagram.feedbackLabel, feedbackX + 34, arrowStartY + 20);

  diagram.forcingArrow.dataset.positivePath = `M${forcingX} ${arrowStartY.toFixed(1)} L${forcingX} ${(topY - 10).toFixed(1)}`;
  diagram.forcingArrow.dataset.negativePath = `M${forcingX} ${(topY - 10).toFixed(1)} L${forcingX} ${arrowStartY.toFixed(1)}`;
  diagram.feedbackArrow.dataset.positivePath = `M${feedbackX} ${topY.toFixed(1)} L${feedbackX} ${(topY - arrowLength).toFixed(1)}`;
  diagram.feedbackArrow.dataset.negativePath = `M${feedbackX} ${(topY - arrowLength).toFixed(1)} L${feedbackX} ${topY.toFixed(1)}`;
  diagram.exchangeArrow.setAttribute("d", `M${exchangeX} ${exchangeY1.toFixed(1)} L${exchangeX} ${exchangeY2.toFixed(1)}`);
}

function updateDiagram(year) {
  const point = getPoint(year);
  const forcing = forcingValue();
  const feedbackFlux = value("feedback") * point.surface;
  const referenceFlux = fluxArrowReference;

  if (mode === "one") {
    updateOneBoxGeometry();
    diagram.oneSurface.style.fill = boxFillForTemperature(point.surface, [237, 241, 246]);
    diagram.oneTemp.textContent = `T′ = ${point.surface.toFixed(2)} K`;
    diagram.oneForcingArrow.setAttribute(
      "d",
      forcing >= 0 ? diagram.oneForcingArrow.dataset.positivePath : diagram.oneForcingArrow.dataset.negativePath
    );
    diagram.oneFeedbackArrow.setAttribute(
      "d",
      feedbackFlux >= 0 ? diagram.oneFeedbackArrow.dataset.positivePath : diagram.oneFeedbackArrow.dataset.negativePath
    );
    setFluxArrow(diagram.oneForcingArrow, diagram.redMarker, forcing, referenceFlux);
    setFluxArrow(diagram.oneFeedbackArrow, diagram.blueMarker, feedbackFlux, referenceFlux);
  }

  if (mode === "two") {
    updateTwoBoxGeometry();
    const exchangeFlux = value("exchange") * (point.surface - point.deep);
    diagram.mixedLayer.style.fill = boxFillForTemperature(point.surface, [240, 243, 247]);
    diagram.deepOcean.style.fill = boxFillForTemperature(point.deep, [215, 222, 231]);
    setSubscriptTemperature(diagram.mixedTemp, "s", point.surface);
    setSubscriptTemperature(diagram.deepTemp, "d", point.deep);
    diagram.forcingArrow.setAttribute(
      "d",
      forcing >= 0 ? diagram.forcingArrow.dataset.positivePath : diagram.forcingArrow.dataset.negativePath
    );
    diagram.feedbackArrow.setAttribute(
      "d",
      feedbackFlux >= 0 ? diagram.feedbackArrow.dataset.positivePath : diagram.feedbackArrow.dataset.negativePath
    );
    setFluxArrow(diagram.forcingArrow, diagram.redMarker, forcing, referenceFlux);
    setFluxArrow(diagram.feedbackArrow, diagram.blueMarker, feedbackFlux, referenceFlux);
    setFluxArrow(diagram.exchangeArrow, diagram.tealMarker, exchangeFlux, referenceFlux);
  }
}

function setupChart(canvas, ctx, cssHeight, yMin, yMax, yLabel, year, options = {}) {
  const showXAxis = options.showXAxis !== false;
  const yAxisState = options.yAxisKey ? yAxisStates[options.yAxisKey] : null;
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = Math.max(360, Math.round(canvas.parentElement.clientWidth || canvas.clientWidth || 560));
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = cssWidth;
  const height = cssHeight;
  const pad = { top: 18, right: 8, bottom: showXAxis ? 66 : 24, left: 100 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const maxYear = Math.max(1, displayedXAxisMaxYear);
  const displayedYMin = yAxisState?.displayedMin ?? yMin;
  const displayedYMax = yAxisState?.displayedMax ?? yMax;
  const yTickValues = yAxisState?.tickValues.length ? yAxisState.tickValues : makeYAxisTicks(yMin, yMax);
  const previousYTickValues = yAxisState?.previousTickValues ?? [];
  const yAxisProgress = yAxisState?.animationProgress ?? 1;
  const toX = (xYear) => pad.left + (xYear / maxYear) * innerWidth;
  const toY = (chartValue) =>
    pad.top + innerHeight - ((chartValue - displayedYMin) / (displayedYMax - displayedYMin)) * innerHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d5e2ed";
  ctx.lineWidth = 1;
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = "#526b80";

  function drawYAxisTickSet(ticks, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#d5e2ed";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#526b80";
    ctx.font = "15px system-ui, sans-serif";
    ticks.forEach((label) => {
      const y = toY(label);
      if (y < pad.top - 24 || y > height - pad.bottom + 24) return;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(formatYAxisTick(label), pad.left - 12, y + 4);
    });
    ctx.restore();
  }

  function drawXTickSet(ticks, alpha, drawLabels) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#e3edf5";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#526b80";
    ctx.font = "15px system-ui, sans-serif";
    ticks.forEach((tickYear, index) => {
      const x = toX(tickYear);
      if (x < pad.left - 48 || x > width - pad.right + 48) return;
      if (tickYear !== 0) {
        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, height - pad.bottom);
        ctx.stroke();
      }
      if (!drawLabels) return;
      const isFinalTick = index === ticks.length - 1;
      const labelX = isFinalTick ? width - pad.right : x;
      ctx.textAlign = isFinalTick ? "right" : "center";
      ctx.textBaseline = "top";
      ctx.fillText(formatYearTick(tickYear), labelX, height - pad.bottom + 14);
    });
    ctx.restore();
  }

  if (previousYTickValues.length) {
    drawYAxisTickSet(previousYTickValues, 0.65 * (1 - yAxisProgress));
    drawYAxisTickSet(yTickValues, 0.35 + 0.65 * yAxisProgress);
  } else {
    drawYAxisTickSet(yTickValues, 1);
  }

  if (xAxisPreviousTickYears.length) {
    drawXTickSet(xAxisPreviousTickYears, 0.65 * (1 - xAxisAnimationProgress), showXAxis);
    drawXTickSet(xAxisTickYears, 0.35 + 0.65 * xAxisAnimationProgress, showXAxis);
  } else {
    drawXTickSet(xAxisTickYears, 1, showXAxis);
  }

  const zeroY = toY(0);
  if (zeroY >= pad.top && zeroY <= height - pad.bottom) {
    ctx.strokeStyle = "#bfd1f8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(width - pad.right, zeroY);
    ctx.stroke();
  }

  ctx.strokeStyle = "#163047";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.lineTo(width - pad.right, height - pad.bottom);
  ctx.stroke();

  const markerX = toX(year);
  ctx.strokeStyle = "rgba(22, 48, 71, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(markerX, pad.top);
  ctx.lineTo(markerX, height - pad.bottom);
  ctx.stroke();

  ctx.fillStyle = "#163047";
  ctx.font = "700 13px system-ui, sans-serif";
  if (showXAxis) {
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Year", pad.left + innerWidth / 2, height - 12);
  }
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(pad.left - 54, pad.top + innerHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  return { width, height, pad, innerWidth, innerHeight, toX, toY, yMin: displayedYMin, yMax: displayedYMax };
}

function drawSeries(ctx, chart, data, key, color, width = 4, dash = []) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(chart.pad.left, chart.pad.top, chart.innerWidth, chart.innerHeight);
  ctx.clip();
  ctx.setLineDash(dash);
  ctx.beginPath();
  data.forEach((point, index) => {
    const x = chart.toX(point.year);
    const y = chart.toY(point[key]);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawHorizontalLine(ctx, chart, valueToDraw, color, width = 2, dash = []) {
  if (valueToDraw < chart.yMin || valueToDraw > chart.yMax) return;
  const y = chart.toY(valueToDraw);
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(chart.pad.left, y);
  ctx.lineTo(chart.width - chart.pad.right, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.setLineDash([]);
}

function updateHtmlLegend(container, items) {
  container.replaceChildren();
  items.forEach((item) => {
    const row = document.createElement("div");
    const swatch = document.createElement("span");
    const label = document.createElement("span");

    row.className = "legend-item";
    swatch.className = `legend-swatch${item.dash ? " is-dashed" : ""}`;
    swatch.style.color = item.color;
    label.textContent = item.label;

    row.append(swatch, label);
    container.append(row);
  });
}

function drawTemperatureChart(year) {
  const series = mode === "two" ? ["surface", "deep"] : ["surface"];
  const ecs = forcingValue() / value("feedback");
  const values = points.flatMap((point) => series.map((key) => point[key]));
  const minValue = Math.min(0, ecs, ...values);
  const maxValue = Math.max(0, ecs, ...values);
  const { yMin, yMax } = steppedYAxisRange(minValue, maxValue);
  setYAxisRange("temperature", yMin, yMax);
  const chart = setupChart(temperatureCanvas, temperatureCtx, 300, yMin, yMax, "Temperature anomaly (K)", year, {
    showXAxis: false,
    yAxisKey: "temperature",
  });

  if (mode === "two") {
    drawSeries(temperatureCtx, chart, points, "deep", "#4d5866", 4.4);
    drawSeries(temperatureCtx, chart, points, "surface", "#9aa5b1", 4.4);
  } else {
    drawSeries(temperatureCtx, chart, points, "surface", "#303846", 4.4);
  }
  drawHorizontalLine(temperatureCtx, chart, ecs, "#111827", 2, [8, 6]);
  updateHtmlLegend(
    temperatureLegend,
    mode === "two"
      ? [
          { label: "Ts′", color: "#4d5866" },
          { label: "Td′", color: "#9aa5b1" },
          { label: "ECS", color: "#111827", dash: true },
        ]
      : [
          { label: "T′", color: "#303846" },
          { label: "ECS", color: "#111827", dash: true },
        ]
  );
}

function fluxBudgetSeries() {
  const forcing = forcingValue();
  const feedback = value("feedback");
  const exchange = value("exchange");

  return points.map((point) => {
    const response = feedback * point.surface;
    const interaction = mode === "two" ? exchange * (point.surface - point.deep) : 0;
    return {
      year: point.year,
      forcing,
      response,
      interaction,
    };
  });
}

function drawFluxChart(year) {
  const data = fluxBudgetSeries();
  const keys = mode === "two" ? ["forcing", "response", "interaction"] : ["forcing", "response"];
  const values = data.flatMap((point) => keys.map((key) => point[key]));
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const { yMin, yMax } = steppedYAxisRange(minValue, maxValue);
  setYAxisRange("flux", yMin, yMax);
  const chart = setupChart(fluxCanvas, fluxCtx, 340, yMin, yMax, "Flux (W m⁻²)", year, {
    yAxisKey: "flux",
  });
  const legend = [
    { key: "forcing", label: "F′", color: "#d23f3f", width: 54 },
    { key: "response", label: mode === "two" ? "λTs′" : "λT′", color: "#5474b8", width: 78 },
  ];

  if (mode === "two") legend.splice(2, 0, { key: "interaction", label: "κ(Ts′ - Td′)", color: "#3b9f9a", width: 118 });
  legend.forEach((item) => drawSeries(fluxCtx, chart, data, item.key, item.color, 3.2, item.dash || []));
  updateHtmlLegend(fluxLegend, legend);
}

function updateOutputs() {
  outputs.forcing.value = `${value("forcing").toFixed(1)} W m⁻²`;
  outputs.feedback.value = `${value("feedback").toFixed(2)} W m⁻² K⁻¹`;
  outputs.mixedDepth.value = `${value("mixedDepth").toFixed(0)} m`;
  outputs.deepDepth.value = `${value("deepDepth").toFixed(0)} m`;
  outputs.exchange.value = `${value("exchange").toFixed(2)} W m⁻² K⁻¹`;
}

function render() {
  try {
    if (!points.length) {
      const response = computeResponse();
      points = response.points;
      setXAxisMaxYear(response.maxYear, false);
    }
    const maxYear = currentMaxYear();
    timeSlider.max = String(maxYear);
    if (Number(timeSlider.value) > maxYear) timeSlider.value = String(maxYear);
    const year = Number(timeSlider.value);
    timeValue.value = String(year);
    updateOutputs();
    updateDiagram(year);
    drawTemperatureChart(year);
    drawFluxChart(year);
  } catch (error) {
    document.body.dataset.renderError = error.message;
    console.error(error);
  }
}

function recompute(resetTime = false, animateAxis = true) {
  const response = computeResponse();
  points = response.points;
  setXAxisMaxYear(response.maxYear, animateAxis);
  if (resetTime) timeSlider.value = "0";
  else if (Number(timeSlider.value) > response.maxYear) timeSlider.value = String(response.maxYear);
  render();
}

function setMode(nextMode, animateAxis = true) {
  mode = nextMode;
  document.body.dataset.model = mode;
  setHidden(oneElements, mode !== "one");
  setHidden(twoElements, mode !== "two");
  updateModeParameterLabels();

  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  recompute(true, animateAxis);
}

function stopPlayback() {
  isPlaying = false;
  playButton.textContent = "Play";
  lastFrameTime = null;
  if (animationId) cancelAnimationFrame(animationId);
}

function tick(timestamp) {
  if (!isPlaying) return;
  if (lastFrameTime === null) lastFrameTime = timestamp;
  const elapsed = timestamp - lastFrameTime;

  if (elapsed > 45) {
    lastFrameTime = timestamp;
    let nextYear = Number(timeSlider.value) + 1;
    if (nextYear > currentMaxYear()) nextYear = 0;
    timeSlider.value = String(nextYear);
    render();
  }

  animationId = requestAnimationFrame(tick);
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
    return;
  }

  isPlaying = true;
  playButton.textContent = "Pause";
  animationId = requestAnimationFrame(tick);
}

Object.values(controls).forEach((input) => {
  input.addEventListener("input", () => recompute(false));
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    history.replaceState(null, "", `#${button.dataset.mode}`);
    setMode(button.dataset.mode);
  });
});

timeSlider.addEventListener("input", render);
playButton.addEventListener("click", togglePlayback);
forcingSignButton.addEventListener("click", () => {
  forcingSign *= -1;
  updateForcingSignButton();
  recompute(false);
});
window.addEventListener("resize", render);
window.addEventListener("load", render);

const initialMode = location.hash.slice(1) === "two" ? "two" : "one";
updateForcingSignButton();
setMode(initialMode, false);
requestAnimationFrame(render);
