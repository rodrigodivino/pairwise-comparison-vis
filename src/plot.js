/*global d3*/
import { bootComparison, getPooledStd } from "./utils.js";

function draw(data, tasks, groups) {
  const groupsPermut = [];
  for (let separator = 1; separator < groups.length; separator++) {
    for (let i = 0; i + separator < groups.length; i++) {
      groupsPermut.push(groups[i] + "," + groups[i + separator]);
    }
  }

  const width = 400;
  const height = 2000;
  const margin = { top: 30, left: 60, right: 30, bottom: 10 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const plot = d3
    .select("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const rootContainerPad = 50;
  const rootContainerWidth = innerWidth;
  const rootContainerHeight = innerHeight / tasks.length - rootContainerPad;

  const rootContainers = plot
    .selectAll("g.rootContainer")
    .data(tasks.map(d => data.filter(e => e.task === d)))
    .join("g")
    .attr(
      "transform",
      (_, i) => `translate(0,${i * (rootContainerHeight + rootContainerPad)})`
    );

  rootContainers
    .append("rect")
    .attr("x", -0.5)
    .attr("y", -0.5)
    .attr("width", rootContainerWidth + 1)
    .attr("height", rootContainerHeight + 1)
    .attr("fill", "none")
    .attr("stroke", "black");

  rootContainers
    .append("text")
    .attr("x", -30)
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "middle")
    .attr("y", rootContainerHeight / 2)
    .text(arr => "T" + arr[0].task);

  const comparisonContainerWidth = rootContainerWidth;
  const comparisonContainerHeight = rootContainerHeight / groupsPermut.length;
  const comparisonContainers = rootContainers
    .selectAll("g.comparisonContainer")
    .data(taskArr =>
      groupsPermut.map(tag => {
        const [term1, term2] = tag.split(",");
        return {
          term1: taskArr.filter(e => e.group === term1),
          term2: taskArr.filter(e => e.group === term2)
        };
      })
    )
    .join("g")
    .attr(
      "transform",
      (_, i) => `translate(0,${i * comparisonContainerHeight})`
    )
    .classed("comparisonContainer", true);

  comparisonContainers
    .append("rect")
    .attr("width", comparisonContainerWidth)
    .attr("height", comparisonContainerHeight)
    .attr("fill", "none")
    .attr("stroke", "none");

  comparisonContainers.each(function({ term1, term2 }) {
    const arr1 = term1.map(d => d["duration"]);
    const arr2 = term2.map(d => d["duration"]);

    const comp = bootComparison(arr1, arr2);
    d3.select(this).attr("meanDiff", comp.mean);
    d3.select(this).attr("lowerCI", comp.ci[0]);
    d3.select(this).attr("upperCI", comp.ci[1]);
  });

  rootContainers.each(function() {
    const rootContainer = d3.select(this);
    let minValidAbsCis = [];
    const fallBackForNonValids = [];
    rootContainer.selectAll("g.comparisonContainer").each(function() {
      const lowerCI = parseFloat(d3.select(this).attr("lowerCI"));
      const upperCI = parseFloat(d3.select(this).attr("upperCI"));
      const minAbsCI = d3.min([Math.abs(lowerCI), Math.abs(upperCI)]);
      if (Math.sign(lowerCI) === Math.sign(upperCI)) {
        minValidAbsCis.push(minAbsCI);
      }
      fallBackForNonValids.push(minAbsCI);
    });

    if (minValidAbsCis.length === 0) {
      minValidAbsCis = fallBackForNonValids;
    }
    const maxCloserCi = d3.max(minValidAbsCis, Math.abs);
    const x = d3
      .scaleLinear()
      .domain([-maxCloserCi * 1.4, maxCloserCi * 1.4])
      .range([0, comparisonContainerWidth]);

    const axisG = d3.select(this).append("g");
    axisG.call(d3.axisTop(x).ticks(5));
    axisG
      .selectAll("g.tick")
      .selectAll("text")
      .text(function() {
        return Math.abs(parseFloat(d3.select(this).text()));
      });
    axisG
      .append("text")
      .attr("x", rootContainerWidth * 0.5)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "baseline")
      .attr("fill", "black")
      .attr("font-weight", "bolder")
      .attr("y", -20)
      .text("Δ Time (seconds)");

    rootContainer
      .append("line")
      .classed("zero", true)
      .attr("x1", x(0))
      .attr("x2", x(0))
      .attr("y1", 0)
      .attr("y2", rootContainerHeight)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", 2);

    rootContainer
      .selectAll("g.comparisonContainer")
      .each(function({ term1, term2 }) {
        const arr1 = term1.map(d => d["duration"]);
        const arr2 = term2.map(d => d["duration"]);
        const comparisonContainer = d3.select(this);
        const lowerCI = parseFloat(comparisonContainer.attr("lowerCI"));
        const upperCI = parseFloat(comparisonContainer.attr("upperCI"));
        const mean = parseFloat(comparisonContainer.attr("meanDiff"));

        const pooledStd = getPooledStd(arr1, arr2);

        comparisonContainer
          .append("rect")
          .classed("nosizeright", true)
          .attr("x", x(0))
          .attr("stroke-width", 0.8)
          .attr("stroke", "black")
          .attr("width", () => {
            if (x(0.2 * pooledStd) - x(0) < 0) {
              return 0;
            } else if (x(0.2 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0) < 0
                ? 0
                : comparisonContainerWidth - x(0);
            } else {
              return x(0.2 * pooledStd) - x(0) < 0
                ? 0
                : x(0.2 * pooledStd) - x(0);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][0])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("nosizeleft", true)
          .attr("stroke-width", 0.8)
          .attr("stroke", "black")
          .attr("x", () => {
            if (x(0.2 * pooledStd) - x(0) < 0) {
              return x(0) - 0;
            } else if (x(0.2 * pooledStd) > comparisonContainerWidth) {
              return x(0) - (comparisonContainerWidth - x(0));
            } else {
              return x(0) - (x(0.2 * pooledStd) - x(0));
            }
          })
          .attr("width", () => {
            if (x(0.2 * pooledStd) - x(0) < 0) {
              return 0;
            } else if (x(0.2 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0) < 0
                ? 0
                : comparisonContainerWidth - x(0);
            } else {
              return x(0.2 * pooledStd) - x(0) < 0
                ? 0
                : x(0.2 * pooledStd) - x(0);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][0])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("smallsizeright", true)
          .attr("stroke-width", 0.8)
          .attr("stroke", "black")
          .attr("x", x(0.2 * pooledStd) - 1)
          .attr("width", () => {
            if (x(0.5 * pooledStd) - x(0.2 * pooledStd) < 0) {
              return 0;
            } else if (x(0.5 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0.2 * pooledStd) < 0
                ? 0
                : comparisonContainerWidth - x(0.2 * pooledStd);
            } else {
              return x(0.5 * pooledStd) - x(0.2 * pooledStd) < 0
                ? 0
                : x(0.5 * pooledStd) - x(0.2 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][1])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("smallsizeleft", true)
          .attr("stroke-width", 0.8)
          .attr("stroke", "black")
          .attr("x", () => {
            if (x(0.5 * pooledStd) - x(0.2 * pooledStd) < 0) {
              return x(-(0.2 * pooledStd)) - 0;
            } else if (x(0.5 * pooledStd) > comparisonContainerWidth) {
              return (
                x(-(0.2 * pooledStd)) -
                (comparisonContainerWidth - x(0.2 * pooledStd))
              );
            } else {
              return (
                x(-(0.2 * pooledStd)) -
                (x(0.5 * pooledStd) - x(0.2 * pooledStd))
              );
            }
          })
          .attr("width", () => {
            if (x(0.5 * pooledStd) - x(0.2 * pooledStd) < 0) {
              return 0;
            } else if (x(0.5 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0.2 * pooledStd) < 0
                ? 0
                : comparisonContainerWidth - x(0.2 * pooledStd);
            } else {
              return x(0.5 * pooledStd) - x(0.2 * pooledStd) < 0
                ? 0
                : x(0.5 * pooledStd) - x(0.2 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][1])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("mediumsizeright", true)
          .attr("stroke-width", 0.8)
          .attr("stroke", "black")
          .attr("x", x(0.5 * pooledStd) - 1)
          .attr("width", () => {
            if (x(0.8 * pooledStd) - x(0.5 * pooledStd) < 0) {
              return 0;
            } else if (x(0.8 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0.5 * pooledStd) < 0
                ? 0
                : comparisonContainerWidth - x(0.5 * pooledStd);
            } else {
              return x(0.8 * pooledStd) - x(0.5 * pooledStd) < 0
                ? 0
                : x(0.8 * pooledStd) - x(0.5 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][2])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("mediumsizeleft", true)
          .attr("stroke-width", 0.8)
          .attr("stroke", "black")
          .attr("x", () => {
            if (x(0.8 * pooledStd) - x(0.5 * pooledStd) < 0) {
              return x(-(0.5 * pooledStd)) - 0;
            } else if (x(0.8 * pooledStd) > comparisonContainerWidth) {
              return (
                x(-(0.5 * pooledStd)) -
                (comparisonContainerWidth - x(0.5 * pooledStd))
              );
            } else {
              return (
                x(-(0.5 * pooledStd)) -
                (x(0.8 * pooledStd) - x(0.5 * pooledStd))
              );
            }
          })
          .attr("width", () => {
            if (x(0.8 * pooledStd) - x(0.5 * pooledStd) < 0) {
              return 0;
            } else if (x(0.8 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0.5 * pooledStd) < 0
                ? 0
                : comparisonContainerWidth - x(0.5 * pooledStd);
            } else {
              return x(0.8 * pooledStd) - x(0.5 * pooledStd) < 0
                ? 0
                : x(0.8 * pooledStd) - x(0.5 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][2])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("largesizeright", true)
          .attr("stroke-width", 0.8)
          .attr("stroke", "black")
          .attr("x", x(0.8 * pooledStd) - 1)
          .attr("width", () => {
            if (comparisonContainerWidth - x(0.8 * pooledStd) < 0) {
              return 0;
            } else {
              return comparisonContainerWidth - x(0.8 * pooledStd) < 0
                ? 0
                : comparisonContainerWidth - x(0.8 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][3])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("largesizeleft", true)
          .attr("stroke-width", 0.8)
          .attr("stroke", "black")
          .attr("x", () => {
            if (comparisonContainerWidth - x(0.8 * pooledStd) < 0) {
              return x(-(0.8 * pooledStd)) - 0;
            } else {
              return (
                x(-(0.8 * pooledStd)) -
                (comparisonContainerWidth - x(0.8 * pooledStd))
              );
            }
          })
          .attr("width", () => {
            if (comparisonContainerWidth - x(0.8 * pooledStd) < 0) {
              return 0;
            } else {
              return comparisonContainerWidth - x(0.8 * pooledStd) < 0
                ? 0
                : comparisonContainerWidth - x(0.8 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][3])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        const g = comparisonContainer
          .selectAll("g.ci")
          .data([{ lowerCI, upperCI }])
          .join("g")
          .classed("ci", true);

        g.each(function({ lowerCI, upperCI }) {
          const blockerMiddle = d3.select(this).append("rect");
          const blockerRight = d3.select(this).append("rect");
          const blockerLeft = d3.select(this).append("rect");
          const rightWing = d3.select(this).append("rect");
          const leftWing = d3.select(this).append("rect");
          const line = d3.select(this).append("line");
          const meanCircle = d3.select(this).append("circle");

          const textLeft = d3.select(this).append("text");
          const textRight = d3.select(this).append("text");

          const xPos = x(lowerCI) < 0 ? 0 : x(lowerCI);
          const rectWidth =
            x(upperCI) > comparisonContainerWidth
              ? comparisonContainerWidth - xPos
              : x(upperCI) - xPos;

          const textTags = [term1[0].group, term2[0].group];

          if (x(lowerCI) > 0) {
            leftWing
              .attr("fill", "white")
              .attr("stroke", "black")
              .attr("y", 0.1 * comparisonContainerHeight)
              .attr("height", 0.8 * comparisonContainerHeight)
              .attr("x", x(lowerCI) - 2)
              .attr("width", 4);
          }

          if (x(upperCI) < comparisonContainerWidth) {
            rightWing
              .attr("fill", "white")
              .attr("stroke", "black")
              .attr("y", 0.1 * comparisonContainerHeight)
              .attr("height", 0.8 * comparisonContainerHeight)
              .attr("x", x(upperCI) - 2)
              .attr("width", 4);
          }

          line
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("x1", 2 + (x(lowerCI) < 0 ? 0 : x(lowerCI)))
            .attr(
              "x2",
              -2 +
                (x(upperCI) > comparisonContainerWidth
                  ? comparisonContainerWidth
                  : x(upperCI))
            )
            .attr("y1", comparisonContainerHeight * 0.5)
            .attr("y2", comparisonContainerHeight * 0.5);

          if (x(mean) > 0 && x(mean) < comparisonContainerWidth) {
            meanCircle
              .attr("r", comparisonContainerHeight * 0.1)
              .attr("cx", x(mean))
              .attr("cy", comparisonContainerHeight / 2)
              .attr("fill", "white")
              .attr("stroke-width", 1.5)
              .attr("stroke", "black");
          }

          blockerMiddle
            .attr("fill", "white")
            .attr("stroke", "none")
            .attr("fill-opacity", 1)
            .attr("y", 1)
            .attr("x", xPos)
            .attr("width", rectWidth)
            .attr("height", comparisonContainerHeight - 2);

          blockerRight
            .attr("fill", "white")
            .attr("stroke", "none")
            .attr("y", 1)
            .attr("height", comparisonContainerHeight - 2)
            .attr("x", function() {
              if (Math.sign(upperCI) !== Math.sign(lowerCI)) {
                return x(upperCI);
              } else if (upperCI < 0) {
                return x(0);
              } else {
                return x(upperCI);
              }
            })
            .attr("width", function() {
              if (Math.sign(upperCI) !== Math.sign(lowerCI)) {
                const width = comparisonContainerWidth - x(upperCI);
                return width < 0 ? 0 : width;
              } else if (upperCI < 0) {
                return comparisonContainerWidth - x(0);
              } else {
                const width = comparisonContainerWidth - x(upperCI);
                return width > 0 ? width : 0;
              }
            });

          blockerLeft
            .attr("fill", "white")
            .attr("stroke", "none")
            .classed("blocker2", true)
            .attr("y", 1)
            .attr("height", comparisonContainerHeight - 2)
            .attr("x", function() {
              if (Math.sign(upperCI) !== Math.sign(lowerCI)) {
                return 0;
              } else if (lowerCI > 0) {
                return 0;
              } else {
                return 0;
              }
            })
            .attr("width", function() {
              if (Math.sign(upperCI) !== Math.sign(lowerCI)) {
                const width = x(lowerCI) < 0 ? 0 : x(lowerCI);
                return width < 0 ? 0 : width;
              } else if (lowerCI > 0) {
                return x(0) < 0 ? 0 : x(0);
              } else {
                return x(lowerCI) < 0 ? 0 : x(lowerCI);
              }
            });

          textLeft
            .attr("x", -5)
            .attr("y", comparisonContainerHeight * 0.5)
            .attr("alignment-baseline", "middle")
            .attr("text-anchor", "end")
            .text(textTags[0]);

          textRight
            .attr("x", comparisonContainerWidth + 5)
            .attr("y", comparisonContainerHeight * 0.5)
            .attr("alignment-baseline", "middle")
            .attr("text-anchor", "start")
            .text(textTags[1]);
        });
      });
  });
}

export default draw;
