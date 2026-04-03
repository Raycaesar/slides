// ===============================================
// =============== GLOBAL VARIABLES ==============
// ===============================================

// 固定 Agents 和 Props
let Agt = ['a', 'b', 'c', 'd'];
let Prop = ['p', 'q', 'r', 's'];

let agentFollowers = {};
let agentBeliefs = {};
const agentColors = {};
const colors = ['#D67293', ' #73DEFA', '#5DB117', '#5A8CD7', '#CCCC00', '#9A5FD7', '#FA1CA8', '#A300A3', '#00A3A3'];



// 新增 (问题3): 用于 "Restore" 功能
let lastAgentBeliefs = null;


// ===============================================
// =============== INITIALIZATION ================
// ===============================================

function initializeApp() {
    // 1. 设置 Agent 颜色
    Agt.forEach((agent, index) => {
        agentColors[agent] = colors[index % colors.length];
    });

    // 2. 绑定事件监听器
    document.getElementById("randomizeNetworkBtn").addEventListener("click", randomizeNetwork);
    document.getElementById("randomizeBeliefsBtn").addEventListener("click", randomizeBeliefs);
    
 
document.getElementById("construct_countermodel").addEventListener("click", () => {
    CreatCounterModel();
    drawCounterNetwork(); // 自动适配容器
    displayPowerSet(".beliefCanvas");
});



    document.getElementById("updateModelBtn").addEventListener("click", handleUpdateModelClick);
    document.getElementById("checkSatBtn").addEventListener("click", satisfiability);
    
    document.getElementById("checkSatBtn_countermodel").addEventListener("click", satisfiability_new);
    
    // 新增 (问题3): 绑定 Restore 按钮
    document.getElementById("restoreBeliefsBtn").addEventListener("click", restoreBeliefs);
    
    

    // 4. 立即生成一个初始网络和信念
    randomizeNetwork();
    randomizeBeliefs();
    
    console.log("App Initialized. Agents and Props are fixed.");
}


// ===============================================
// =============== NEW RANDOM FUNCTIONS ==========
// ===============================================


function CreatCounterModel() {
//反模型社交网络
    agentFollowers = { 'a': ['b'], 'b': ['c'], 'c': [], 'd': [] };

    //反模型信念
    agentBeliefs = {
        'a': { messages: ["V"], denotation: formatDenotation(powerSet(Prop)) },
        'b': { messages: ["(p→q)"], denotation: replaceWithDenotation(parse(tokenize("(~p+q)"))) },
        'c': { messages: ["(q→r)"], denotation: replaceWithDenotation(parse(tokenize("(~q+r)"))) },
        'd': { messages: ["V"], denotation: formatDenotation(powerSet(Prop)) }
    };
   
    
   
}


function randomizeNetwork() {
    agentFollowers = {}; // 重置 followers
    
    for (let agent of Agt) {
        // ========== 修复点 1 (Problem 1) ==========
        // 移除自我 follow, 避免 buggy 的 linkArc 渲染
        const otherAgents = Agt.filter(f => f !== agent);
        const selectedFollowers = otherAgents.filter(() => Math.random() > 0.5); 
        agentFollowers[agent] = selectedFollowers;
        // =========================================
    }
    
    displayFollowers();
    drawNetwork(); // 此函数填充 #networkCanvas
    
    // 修改 (问题1): 等待 500ms 让模拟稳定, 然后再克隆
    setTimeout(cloneNetworkGraph, 500);
    
    console.log("Network randomized (NO self-follows):", agentFollowers);
}
function randomizeBeliefs() {
    lastAgentBeliefs = null;
    const restoreBtn = document.getElementById("restoreBeliefsBtn");
    if (restoreBtn) {
        restoreBtn.style.display = "none";
    }

    agentBeliefs = {}; // 重置 beliefs
    
    try {
        for (let agent of Agt) {
            const randomFormula = generateRandomFormula();
            const parsed = parse(tokenize(randomFormula));
            const denotationResult = replaceWithDenotation(parsed);
            
            agentBeliefs[agent] = {
                messages: [randomFormula],
                denotation: denotationResult
            };
        }
        
        displayAgentBeliefs();
        displayPowerSet(); // 来自 drawGraph.js 的函数
        console.log("Beliefs randomized:", agentBeliefs);

    } catch (error) {
        console.error("Error randomizing beliefs:", error);
        alert("An error occurred while randomizing beliefs. See console.");
    }
}

/**
 * 辅助函数：生成一个随机的、格式良好的公式
 * @param {number} depth - 当前递归深度，防止无限循环
 */
function generateRandomFormula(depth = 0) {
    // 基础情况: 达到最大深度或随机决定
    if (depth > 2 || Math.random() < 0.4) {
        let atom = Prop[Math.floor(Math.random() * Prop.length)];
        // 随机否定 atom
        if (Math.random() < 0.3) {
            return `~${atom}`;
        }
        return atom;
    }

    let rand = Math.random();
    
    if (rand < 0.3) {
        // 否定一个更复杂的公式
        return `~(${generateRandomFormula(depth + 1)})`;
    } else {
        // 二元操作符
        let op = ['&', '+', '>'][Math.floor(Math.random() * 3)];
        let left = generateRandomFormula(depth + 1);
        let right = generateRandomFormula(depth + 1);
        return `(${left}${op}${right})`;
    }
}


// ================================================
// =============== AGENT & BELIEF DISPLAY =========
// ================================================

function displayFollowers() {
    let outputfollower = '';
    for (let agent in agentFollowers) {
        outputfollower += `f(${agent}) = {${agentFollowers[agent].join(', ')}}\n`;
    }
    const outputEl = document.getElementById("followerOutput");
    if (outputEl) {
        outputEl.innerText = outputfollower;
    }
}

function displayAgentBeliefs() {
    let outputText = '';
    for (let agent in agentBeliefs) {
        if (!agentBeliefs[agent]) continue; // 安全检查
        
        const coloredAgentName = `<span style="color: ${agentColors[agent]}; font-weight: bold;">${agent}</span>`;
        outputText += `${coloredAgentName} believes ${agentBeliefs[agent].messages.join(' and ')}\n k(${agent}) = ${agentBeliefs[agent].denotation}<br><br>`;
    }
    const outputEl = document.getElementById("beliefOutput");
    if (outputEl) {
        outputEl.innerHTML = outputText; // 使用 innerHTML 渲染颜色
    }
}




// ================================================
// =============== PARSE & DENOTATION =============
// ================================================

// Tokenizer
function tokenize(formula) {
    return formula.match(/~|\+|&|>|[a-z]_[0-9]+|[a-z]|[\(\)]/g);
}

// Recursive parser
function parse(tokens) {
    if (tokens.length === 0) throw new Error("Unexpected end of input");

    let token = tokens.shift();
    
    if (token === '~') {
        return {
            type: 'negation',
            subformula: parse(tokens)
        };
    } else if (token === '(') {
        let left = parse(tokens);
        
        if (tokens.length === 0 || ['&', '+', '>'].indexOf(tokens[0]) === -1) {
            if (tokens[0] === ')') {
                tokens.shift();
                return left; // 只是括号括起来的子公式
            }
            throw new Error("Expected an operator or closing bracket");
        }
        
        let operator = tokens.shift();
        let right = parse(tokens);
        
        if (tokens[0] !== ')') {
            throw new Error("Expected a closing bracket");
        }
        
        tokens.shift(); 
        return {
            type: operator,
            left: left,
            right: right
        };
    } else if (Prop.includes(token)) {  // atom
        return {
            type: 'atom',
            value: token
        };
    } else {
        throw new Error(`Unexpected token: ${token}`);
    }
}

//message Check
function isWellFormedSimpleCheck(message) {
    const openBrackets = (message.match(/\(/g) || []).length;
    const closeBrackets = (message.match(/\)/g) || []).length;
    return openBrackets === closeBrackets;
}

// Denotation Compute
function replaceWithDenotation(parsedFormula) {
    if (!parsedFormula) throw new Error("Invalid or non-well-formed formula.");

    switch (parsedFormula.type) {
        case 'atom':
            return formatDenotation(atomDenotation(parsedFormula.value));
        case 'negation':
            return handleNegation(parsedFormula.subformula);
        case '&':
        case '+':
            return handleBinaryOperator(parsedFormula);
        case '>':
            return handleImplication(parsedFormula);
        default:
            return replaceWithDenotation(parsedFormula);
    }
}

function handleNegation(subformula) {
    const innerDenotation = replaceWithDenotation(subformula);
    if (innerDenotation === formatDenotation(powerSet(Prop))) {
        return '{}';
    } else {
        let complementSet = complementOfSet(parseSet(innerDenotation));
        return formatDenotation(complementSet);
    }
}

function handleBinaryOperator(parsedFormula) {
    const leftDenotation = parseSet(replaceWithDenotation(parsedFormula.left));
    const rightDenotation = parseSet(replaceWithDenotation(parsedFormula.right));

    let resultSet = parsedFormula.type === '&'
        ? setIntersection(leftDenotation, rightDenotation)
        : setUnion(leftDenotation, rightDenotation);

    return formatDenotation(resultSet);
}

function handleImplication(parsedFormula) {
    const notLeft = { type: 'negation', subformula: parsedFormula.left };
    const orRight = { type: '+', left: notLeft, right: parsedFormula.right };
    return replaceWithDenotation(orRight);
}

function formatDenotation(set) {
    if (set.length === 0) return '{}';
    const sortedSet = set.map(subset => subset.sort()).sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.join(','), b.join(',');
    });
    return `{{${sortedSet.map(subset => subset.join(', ')).join('}, {')}}}`;
}



// ===============================================
// =============== BELIEF UPDATE (ANNOUNCEMENT) ====
// ===============================================

function parseSet(denotation) {
    if (denotation === '{}' || denotation === '' || !denotation) return [];
    return denotation.slice(2, -2).split('}, {')
                     .map(str => str.split(',').map(element => element.trim()).filter(Boolean));
}

function stringToDenotation(denotationStr) {
    if (denotationStr === '{}' || denotationStr === '' || !denotationStr) return [];
    return denotationStr.slice(2, -2).split('}, {')
        .map(str => str.split(',').map(element => element.trim()).filter(Boolean));
}

function denotationToString(denotation) {
    if (denotation.length === 0) return '{}';
     const sortedSet = denotation.map(subset => subset.sort()).sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.join(','), b.join(',');
    });
    return `{{${sortedSet.map(set => set.join(', ')).join('}, {')}}}`;
}


function parseAnnouncement(announcementString) {
    if (typeof announcementString !== 'string' || announcementString.trim() === '') {
        throw new Error('Announcement must be a non-empty string');
    }
    const tokens = tokenizeFormula(announcementString); // 使用下面的 tokenizeFormula
    if (!tokens.length) throw new Error('No tokens to parse');
    
    const token = tokens.shift();
    if (!token.startsWith('[')) throw new Error('Invalid announcement format');

    const agent = token[1];
    const content = token.slice(3, -1);
    const announcement = token;

    return { agent, content, announcement };
}

function updatedmodels(announcement) {
    try {
        const parsedAnnouncement = parseAnnouncement(announcement);
        const announcementAgent = parsedAnnouncement.agent;
        const announcementProposition = parsedAnnouncement.content;

        if (!isWellFormedSimpleCheck(announcementProposition)) {
             throw new Error("Announcement message is not well-formed!");
        }

        const announcementDenotation = replaceWithDenotation(parse(tokenize(announcementProposition)));
        const announcementWorlds = stringToDenotation(announcementDenotation);

        if (!agentFollowers[announcementAgent]) {
            console.warn(`Agent ${announcementAgent} has no followers.`);
            return;
        }

        for (let agt of agentFollowers[announcementAgent]) {
            if (!agentBeliefs[agt]) {
                console.warn(`Agent ${agt} (follower) has no beliefs to update.`);
                continue;
            }
            
            let agentBeliefWorlds = stringToDenotation(agentBeliefs[agt].denotation);
            agentBeliefWorlds = setIntersection(agentBeliefWorlds, announcementWorlds);
            agentBeliefs[agt].denotation = denotationToString(agentBeliefWorlds);
            
            agentBeliefs[agt].messages.push(`(announced: ${announcementProposition})`);
        }
        
        // 更新后重新显示
        displayAgentBeliefs();
        displayPowerSet(); // 这将触发 D3 动画

    } catch (error) {
        alert(`Error updating model: ${error.message}`);
        console.error(error);
    }
}

// ========== 修复点 2 (Problem 2, 3, 4) ==========
// 重构: 移除 setTimeout 和 .fading class
function handleUpdateModelClick() {
    const inputElement = document.getElementById("beliefupdate");
    if (!inputElement) {
        console.error("Input element 'beliefupdate' not found.");
        return;
    }
    const announcement = inputElement.value;
    if (typeof announcement !== 'string' || announcement.trim() === '') {
        alert("Please enter a valid announcement, e.g., [a:p]");
        return;
    }

    // 保存当前状态以便恢复
    lastAgentBeliefs = JSON.parse(JSON.stringify(agentBeliefs)); // 深拷贝
    
    // 立即更新模型
    updatedmodels(announcement); // 这将调用 displayPowerSet() 并触发 D3 动画

    // 立即显示 Restore 按钮
    document.getElementById("restoreBeliefsBtn").style.display = "inline-block";

    inputElement.value = '';
}
// ===============================================


// ================================================
// =============== SATISFIABILITY CHECKER =========
// ================================================

function tokenizeFormula(formula) {
    if (typeof formula !== 'string') {
        throw new TypeError('Formula must be a string.');
    }
   const pattern = /\[[a-z]:[^[\]]+\]|B[a-z]|~|&|\+|>|\(|\)|[a-z]_[0-9]+|[a-z]|T|F/g;
    return formula.match(pattern);
}

function parseFormula(tokens) {
    if (!tokens.length) throw new Error('No tokens to parse');

    const token = tokens.shift();

    if (token === '~') {
        return { type: 'negation', subformula: parseFormula(tokens) };
    } else if (token.startsWith('[')) {
        const agent = token[1];
        const content = token.slice(3, -1);
        const announcement = token;
        return {
            type: 'free announcement',
            agent, content, announcement,
            subformula: parseFormula(tokens)
        };
    } else if (token.startsWith('B')) {
        const agent = token[1];
        let message = '';
        
        if (tokens[0] === '(') {
            message += tokens.shift(); // (
            let balance = 1;
            while (tokens.length > 0) {
                let t = tokens.shift();
                message += t;
                if (t === '(') balance++;
                if (t === ')') balance--;
                if (balance === 0) break;
            }
            if (balance !== 0) throw new Error('Mismatched parentheses in belief literal');
        } else {
            while(tokens.length > 0 && (tokens[0] === '~' || Prop.includes(tokens[0]))) {
                 message += tokens.shift();
            }
        }
        
        if (message === '') throw new Error(`Invalid belief literal for agent ${agent}`);

        return { type: 'belief', agent, message };
    } else if (token === '(') {
        const left = parseFormula(tokens);
        const operator = tokens.shift();
        const right = parseFormula(tokens);
        if (tokens.shift() !== ')') throw new Error('Expected closing parenthesis');
        return { type: operator, left, right };
    } else {
        if (token === 'T') return { type: 'truth', value: true };
        if (token === 'F') return { type: 'truth', value: false };
        throw new Error('Unexpected token: ' + token);
    }
}


function isSubsetOf(subsetWorlds, supersetWorlds) {
    if (subsetWorlds.length === 0) return true; // 空集是所有集合的子集
    
    const supersetStrings = supersetWorlds.map(set => JSON.stringify(set.sort()));
    const subsetStrings = subsetWorlds.map(set => JSON.stringify(set.sort()));
    
    return subsetStrings.every(subset => supersetStrings.includes(subset));
}


function evaluateLiteral(message, agent) {
    console.log("Evaluating literal:", `B${agent}${message}`);
    
    if (!agentBeliefs[agent]) {
        console.warn(`No beliefs found for agent ${agent}.`);
        return false; 
    }
    
    const parsedMessage = parse(tokenize(message));
    const messageDenotation = replaceWithDenotation(parsedMessage);
    let messageWorlds = parseSet(messageDenotation);
    let agentBeliefWorlds = parseSet(agentBeliefs[agent].denotation);
    
    const result = isSubsetOf(agentBeliefWorlds, messageWorlds);
    console.log(`B${agent}${message}: ${result}`);
    return result;
}

  
function evaluateFormula(formula) {
    switch (formula.type) {
        case 'belief':
            return evaluateLiteral(formula.message, formula.agent);
        case 'negation':
            return !evaluateFormula(formula.subformula);
        case '&':
            return evaluateFormula(formula.left) && evaluateFormula(formula.right);
        case '+':
            return evaluateFormula(formula.left) || evaluateFormula(formula.right);
        case '>':
            return !evaluateFormula(formula.left) || evaluateFormula(formula.right);
        case 'free announcement':
            console.log("Evaluating free announcement:", formula.announcement);
            const originalBeliefs = JSON.parse(JSON.stringify(agentBeliefs)); // 深拷贝
            
            updatedmodels(formula.announcement); // 应用更新
            const result = evaluateFormula(formula.subformula); // 在新模型中评估子公式
            agentBeliefs = originalBeliefs; // 恢复原始模型
            
            // 重要：恢复后，需要重绘原始的信念图
            displayAgentBeliefs();
            displayPowerSet(); // 这会触发 D3 动画

            return result;
        case 'truth':
            return formula.value;
    }
}


function satisfiability() {
    const formulaInput = document.getElementById("formulaInput").value.trim();
    const satisfactionEl = document.getElementById("satisfaction");
    
    if (formulaInput === '') {
        satisfactionEl.innerText = "Please enter a formula.";
        return;
    }

    try {
        console.log("Checking formula:", formulaInput);
        const tokens = tokenizeFormula(formulaInput);
        console.log("Tokens:", tokens);
        const parsedFormula = parseFormula(tokens);
        console.log("Parsed Formula:", parsedFormula);
        
        const satResult = evaluateFormula(parsedFormula);
        
        satisfactionEl.innerText = satResult ? "满足" : "不满足";
        satisfactionEl.style.color = satResult ? "#42ff77" : "#ff4250";

    } catch (error) {
        satisfactionEl.innerText = `Error: ${error.message}`;
        satisfactionEl.style.color = "#ff4250";
        console.error("Satisfiability Error:", error);
    }
}

function satisfiability_new() {
    const formulaInput = document.getElementById("formulaInput_countermodel").value.trim();
    const satisfactionEl = document.getElementById("satisfaction_countermodel");
    
    if (formulaInput === '') {
        satisfactionEl.innerText = "Please enter a formula.";
        return;
    }

    try {
        console.log("Checking formula:", formulaInput);
        const tokens = tokenizeFormula(formulaInput);
        console.log("Tokens:", tokens);
        const parsedFormula = parseFormula(tokens);
        console.log("Parsed Formula:", parsedFormula);
        
        const satResult = evaluateFormula(parsedFormula);
        
        satisfactionEl.innerText = satResult ? "满足" : "不满足";
        satisfactionEl.style.color = satResult ? "#42ff77" : "#ff4250";

    } catch (error) {
        satisfactionEl.innerText = `Error: ${error.message}`;
        satisfactionEl.style.color = "#ff4250";
        console.error("Satisfiability Error:", error);
    }
}


// ================================================
// =============== AUXILIARY FUNCTIONS ============
// ================================================

function arraysAreEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();
    for (let i = 0; i < sortedArr1.length; i++) {
        if (sortedArr1[i] !== sortedArr2[i]) return false;
    }
    return true;
}

function setUnion(setA, setB) {
    const union = [...setA];
    for (const subset of setB) {
        if (!union.some(item => arraysAreEqual(item, subset))) {
            union.push(subset);
        }
    }
    return union;
}

function complementOfSet(set) {
    let fullSet = powerSet(Prop);
    return fullSet.filter(subset => !set.some(setSubset => 
        arraysAreEqual(subset, setSubset)
    ));
}

function atomDenotation(atom) {
    return powerSet(Prop).filter(subset => subset.includes(atom));
}

function powerSet(set) {
    const powerSetArr = [];
    const total = Math.pow(2, set.length);
    for (let i = 0; i < total; i++) {
        const subset = [];
        for (let j = 0; j < set.length; j++) {
            if (i & (1 << j)) {
                subset.push(set[j]);
            }
        }
        powerSetArr.push(subset);
    }
    return powerSetArr;
}

function cleanSet(set) {
    return set.map(element => element.replace(/[{}]/g, '').trim());
}

function setIntersection(setA, setB) {
    if (!setA || !setB) return [];
    
    return setA.filter(subsetA => 
        setB.some(subsetB => arraysAreEqual(subsetA, subsetB))
    );
}


// ================================================
// =============== drawGraph.js FUNCTIONS =========
// ================================================

function drawNetwork(targetSelector = "#networkCanvas", customFollowers = agentFollowers) {
    const svg = d3.select(targetSelector);
    if (svg.empty()) {
        console.warn("No SVG found for", targetSelector);
        return;
    }
    svg.selectAll("*").remove();

    svg.append("defs").selectAll("marker")
        .data(["end"])
        .enter().append("marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 30)
        .attr("refY", 0)
        .attr("markerWidth", 10)
        .attr("markerHeight", 30)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .style("fill", "#999");
    
    
    const nodes = Agt.map(agent => ({ id: agent }));
    const links = [];
    for (let agent in agentFollowers) {
        for (let follower of agentFollowers[agent]) {
            links.push({ source: follower, target: agent });
        }
    }

    
    
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;
    const nodeRadius = 20;

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(220))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide(30))
        .force("radial", d3.forceRadial(width / 3.5, width / 3, height / 3));
    simulation.alphaDecay(0.05);

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.7).restart();
        d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
    }
    const drag = d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);

    const link = svg.append("g")
        .attr("id", "links-group")
        .selectAll("path")
        .data(links)
        .enter().append("path")
        .attr("marker-end", d => d.source.id !== d.target.id ? "url(#end)" : null)
        .style("stroke", "#999")
        .attr("fill", "none");
const node = svg.append("g")
        .attr("id", "nodes-group")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 20)
        .attr("fill", d => agentColors[d.id])
        .call(drag);

    const nodeText = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("font-size", 14)
        .attr("fill", "#333") // 在白色背景上使用深色文字
        .attr("font-family", "Arial, sans-serif")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .text(d => d.id)
        .call(drag);

    function linkArc(d) {
        // 修复：此分支现在不会被命中，因为 randomizeNetwork 移除了自我 follow
        if (d.source.id === d.target.id) {
            const dr = 20;
            return `M${d.source.x},${d.source.y - nodeRadius}A${dr},${dr} 0 1,0 ${d.source.x},${d.source.y - (1.5 * nodeRadius)}Z`;
        } else {
            return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
        }
    }

    function constrainPosition(val, max, radius) {
        return Math.max(radius, Math.min(max - radius, val));
    }

    simulation.on("tick", () => {
        link.attr("d", linkArc);
        node.attr("cx", d => constrainPosition(d.x, width, nodeRadius))
            .attr("cy", d => constrainPosition(d.y, height, nodeRadius));
        nodeText.attr("x", d => constrainPosition(d.x, width, 0))
                .attr("y", d => constrainPosition(d.y, height, 4));
    });
}



function drawCounterNetwork(targetSelector = "#networkCanvas_countermodel", customFollowers = agentFollowers) {
    const svg = d3.select(targetSelector);
    if (svg.empty()) {
        console.warn("No SVG found for", targetSelector);
        return;
    }
    svg.selectAll("*").remove();

    // === 读取容器尺寸 ===
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;

    // === 动态缩放参数 ===
const nodeRadius = Math.max(8, Math.min(width, height) / 12);
const linkDistance = Math.min(width, height) * 0.55;
const chargeStrength = -Math.min(width, height) * 0.1;
const markerSize = Math.max(16, nodeRadius * 12); // 增加箭头大小             // 箭头大小

    // === 定义箭头标记 ===

const defs = svg.append("defs");
defs.append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 9)
    .attr("refY", 5)
    .attr("markerWidth", 8)
    .attr("markerHeight", 8)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 L 10 5 L 0 10 z")
    .attr("fill", "#999");

    // === 构建节点与连线数据 ===
    const nodes = Agt.map(agent => ({ id: agent }));
    const links = [];
    for (let agent in customFollowers) {
        for (let follower of customFollowers[agent]) {
            links.push({ source: follower, target: agent });
        }
    }

    // === 力导向布局 ===
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(linkDistance))
        .force("charge", d3.forceManyBody().strength(chargeStrength))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide(nodeRadius * 1.4));

    // --- 拖拽 ---
    const drag = d3.drag()
        .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        });

    // --- 绘制连线 ---
 const link = svg.append("g")
    .attr("stroke", "#999")
    .attr("stroke-width", 1)
    .attr("fill", "none")
    .selectAll("path")
    .data(links)
    .enter()
    .append("path")
    .attr("marker-end", "url(#arrowhead)"); // 改为新的ID

    // --- 绘制节点 ---
    const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("r", nodeRadius)
        .attr("fill", d => agentColors[d.id])
        .call(drag);

    // --- 绘制标签 ---
    const nodeText = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .attr("font-size", Math.max(10, nodeRadius * 0.8))
        .attr("fill", "#222")
        .attr("font-family", "Arial, sans-serif")
        .text(d => d.id);

    // --- 更新位置 ---
    simulation.on("tick", () => {
    link.attr("d", d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // 从源节点边缘到目标节点边缘(留出箭头空间)
        const offsetSource = nodeRadius;
        const offsetTarget = nodeRadius + 2; // 额外空间给箭头
        
        const startX = d.source.x + (dx / dr) * offsetSource;
        const startY = d.source.y + (dy / dr) * offsetSource;
        const endX = d.target.x - (dx / dr) * offsetTarget;
        const endY = d.target.y - (dy / dr) * offsetTarget;
        
        return `M${startX},${startY}L${endX},${endY}`;
    });
    
    node.attr("cx", d => d.x).attr("cy", d => d.y);
    nodeText.attr("x", d => d.x).attr("y", d => d.y);
});
}


function getDenotationResult(agent) {
    if (agentBeliefs[agent] && typeof agentBeliefs[agent].denotation === 'string') {
        const subsets = agentBeliefs[agent].denotation.slice(2, -2).split('}, {');
        return subsets.map(subset => subset.split(', ').filter(Boolean));
    }
    return [];
}

// ========== 修复点 3 (Problem 3) ==========
// 重构: displayPowerSet 完全重写以使用 D3 的 data-join 模式
function displayPowerSet(targetSelector = ".beliefCanvas", customBeliefs = agentBeliefs) {
    console.log("Displaying power set with D3...");

    // 只在当前可见的幻灯片中找 svg
    const currentSlide = d3.select("section.present"); // 当前显示的幻灯片
    const svgContainer = currentSlide.select(targetSelector);
    if (svgContainer.empty()) {
        console.warn("No SVG found in current slide:", targetSelector);
        return;
    }

    const svgWidth = svgContainer.node().getBoundingClientRect().width;
    const svgHeight = svgContainer.node().getBoundingClientRect().height;
    const powerSetOfProp = powerSet(Prop);

    const maxHeight = Prop.length + 1;
    const verticalGap = svgHeight / (maxHeight + 1);
    const circleRadius = Math.min(25, verticalGap / 4); // 动态半径

    // 1. 构建数据
    const nodesData = [];
    for (let i = 0; i <= Prop.length; i++) {
        const subsetsOfSizeI = powerSetOfProp.filter(subset => subset.length === i);
        let beliefsForSubset = {};

        Agt.forEach(agent => {
            if (!agentBeliefs[agent]) return;
            const denotationResult = getDenotationResult(agent);
            subsetsOfSizeI.forEach(subset => {
                const subsetStr = subset.sort().join(',');
                const isSubsetInDenotation = denotationResult.some(denotedSubset => 
                   arraysAreEqual(denotedSubset, subset)
                );
                if (isSubsetInDenotation) {
                    if (!beliefsForSubset[subsetStr]) beliefsForSubset[subsetStr] = [];
                    if (!beliefsForSubset[subsetStr].includes(agent)) {
                        beliefsForSubset[subsetStr].push(agent);
                    }
                }
            });
        });

        subsetsOfSizeI.forEach((subset, j) => {
            const subsetStr = subset.sort().join(',');
            const yOffset = (Prop.length - i + 1) * verticalGap;
            const horizontalGap = svgWidth / (subsetsOfSizeI.length + 1);
            const xOffset = (j + 1) * horizontalGap;
            const agents = beliefsForSubset[subsetStr] || [];
            const agentsWithBeliefs = agents.filter(agent => agentBeliefs[agent] && agentBeliefs[agent].denotation !== '{}');

            nodesData.push({
                id: subsetStr,
                label: subsetStr === '' ? '∅' : subsetStr,
                x: xOffset,
                y: yOffset,
                radius: circleRadius,
                agents: agentsWithBeliefs
            });
        });
    }

    // 2. D3 数据绑定 (使用 .id 作为 key)
    const nodeGroups = svgContainer.selectAll("g.belief-node-group")
        .data(nodesData, d => d.id);

    // 3. ENTER (创建新元素)
    const enterGroups = nodeGroups.enter().append("g")
        .attr("class", "belief-node-group")
        .attr("transform", d => `translate(${d.x},${d.y})`); // 初始位置

    // 将 arc 容器添加在 circle 后面，使其位于底层
    enterGroups.append("g").attr("class", "arc-container");

    enterGroups.append("circle")
        .attr("stroke", "#686673")
        .attr("stroke-width", "0.5")
        .attr("fill", "white") // 初始为白色
        .attr("r", 0); // 初始半径为 0

    enterGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .attr("fill", "#40120a")
        .attr("font-family", "Arial, sans-serif")
        .attr("font-size", "10px");

    // 4. MERGE (更新现有 + 新增元素)
    const updateGroups = enterGroups.merge(nodeGroups);

    // 立即更新位置 (以防窗口大小调整)
    updateGroups.attr("transform", d => `translate(${d.x},${d.y})`);

    // 更新文本 (无过渡)
    updateGroups.select("text").text(d => d.label);

    // 更新圆圈 (有过渡)
    updateGroups.select("circle")
        .transition().duration(1000) // 1 秒过渡
        .attr("r", d => d.radius)
        .attr("fill", d => {
            if (d.agents.length === 1) return agentColors[d.agents[0]];
            if (d.agents.length > 1) return "none";
            return "white";
        });

    // 5. 嵌套连接 (Arcs)
    updateGroups.each(function(d) {
        const arcContainer = d3.select(this).select(".arc-container");
        let arcData = [];

        // 仅当有多个 agent 时才计算 arc 数据
        if (d.agents.length > 1) {
            let startAngle = 0;
            const angleIncrement = 360 / d.agents.length;
            arcData = d.agents.map(agent => {
                const endAngle = startAngle + angleIncrement;
                const pathData = createArcPath(0, 0, startAngle, endAngle, d.radius); // 使用助手函数
                startAngle = endAngle;
                return { agent: agent, path: pathData, color: agentColors[agent] };
            });
        }
        
        // D3 join for paths (arcs), 以 agent ID 为 key
        const arcs = arcContainer.selectAll("path")
            .data(arcData, d => d.agent);

        // EXIT (移除不再存在的 agent 的 arc)
        arcs.exit()
            .transition().duration(500)
            .attr("opacity", 0)
            .remove();

        // ENTER (为新 agent 添加 arc)
        const enterArcs = arcs.enter().append("path")
            .attr("opacity", 0) // 从透明开始
            .attr("d", d => d.path)
            .attr("fill", d => d.color);

        // MERGE (更新 + 新增)
        enterArcs.merge(arcs)
            .transition().duration(1000)
            .attr("opacity", 1) // 渐变
            .attr("d", d => d.path)
            .attr("fill", d => d.color);
    });

    // 6. EXIT (在此应用中不会发生，因为节点数固定)
    nodeGroups.exit().remove();
}

// 辅助函数: 创建 arc 路径
function createArcPath(cx, cy, startAngle, endAngle, radius) {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
        "M", start.x, start.y, 
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        "L", cx, cy, "Z"
    ].join(" ");
}

// 移除: createCircle (逻辑已内联到 displayPowerSet)
// 移除: createArc (逻辑已内联到 displayPowerSet/createArcPath)

// 保留: polarToCartesian (被 createArcPath 使用)
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}
// ===============================================


function cloneNetworkGraph(targetSelector = "#network_clone_container") {
    const originalSvg = document.getElementById("networkCanvas");
    const cloneContainer = document.querySelector(targetSelector);
    if (!originalSvg || !cloneContainer) return;

    const tryClone = (retry = 0) => {
        const nodeGroup = originalSvg.querySelector("#nodes-group");
        if (!nodeGroup) return;
        const bbox = nodeGroup.getBBox();
        if ((bbox.width === 0 || bbox.height === 0) && retry < 5) {
            // 再等一点再试，最多 5 次
            return setTimeout(() => tryClone(retry + 1), 100);
        }
        const padding = 40;
        const viewBoxStr = (bbox.width === 0 && bbox.height === 0)
            ? `0 0 ${originalSvg.width.baseVal.value} ${originalSvg.height.baseVal.value}`
            : `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`;
        cloneWithViewBox(originalSvg, cloneContainer, viewBoxStr);
    };
    tryClone();
}


function cloneWithViewBox(originalSvg, cloneContainer, viewBoxStr) {
    const clonedSvg = originalSvg.cloneNode(true); // 深度克隆
    clonedSvg.id = "networkCanvas_clone";
    clonedSvg.setAttribute("width", "100%");
    clonedSvg.setAttribute("height", "100%");
    clonedSvg.setAttribute("viewBox", viewBoxStr); // 设置新的 viewBox
    clonedSvg.setAttribute("preserveAspectRatio", "xMidYMid meet"); // 确保缩放正确
    cloneContainer.innerHTML = ""; // 清空旧的
    cloneContainer.appendChild(clonedSvg);
}


// ========== 修复点 4 (Problem 3) ==========
// 重构: 移除 setTimeout 和 .fading class
function restoreBeliefs() {
    if (lastAgentBeliefs) {
        // 恢复数据
        agentBeliefs = JSON.parse(JSON.stringify(lastAgentBeliefs)); // 恢复
        lastAgentBeliefs = null; // 只能恢复一次

        // 重绘 (这将自动触发 D3 动画)
        displayAgentBeliefs();
        displayPowerSet(); //

        // 隐藏 "Restore" 按钮
        document.getElementById("restoreBeliefsBtn").style.display = "none";
    }
}
// ===============================================


// ================================================
// =============== APP START ======================
// ================================================

// 等待 DOM 加载完毕后启动应用
document.addEventListener('DOMContentLoaded', (event) => {
    initializeApp();
});