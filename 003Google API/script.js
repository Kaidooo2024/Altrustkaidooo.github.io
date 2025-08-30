// Google Gemini AI 应用主脚本

// API 配置
const API_CONFIG = {
    GEMINI_API_KEY: 'AIzaSyAcNtWMsQI4zxUh2vu3Kv9sp4eW8dx78Yc', // 已配置API密钥
    GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    FALLBACK_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent',
    // 预处理配置
    PREPROCESSING: {
        RESPONSE_LANGUAGE: 'Chinese', // 设置回答语言
        SYSTEM_PROMPT: '你是一个有用的AI助手。请用中文回答，对图片进行简洁明了的分析。重点描述主要内容和关键信息，保持回答简洁。',
        TEMPERATURE: 0.3,
        MAX_TOKENS: 2048
    }
};

// DOM 元素
let imageInput, uploadArea, previewImage, loadingSpinner;
let analysisResults, currentImageDisplay, chatImagePreview, changeImageBtn, regenerateBtn;
let styleSelect, currentConfigSpan;

// Analysis state
let currentAnalysisImage = null;

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    testApiConnection();
    console.log('Google Gemini AI 应用已初始化');
});

// 测试API连接
async function testApiConnection() {
    try {
        console.log('测试API连接...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_CONFIG.GEMINI_API_KEY}`);
        if (response.ok) {
            console.log('API连接正常');
        } else {
            console.error('API连接失败:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('API连接测试失败:', error);
    }
}

// 初始化DOM元素
function initializeElements() {
    // 图像上传相关元素
    imageInput = document.getElementById('imageInput');
    uploadArea = document.getElementById('uploadArea');
    previewImage = document.getElementById('previewImage');
    loadingSpinner = document.getElementById('loadingSpinner');
    
    // 分析结果相关元素
    analysisResults = document.getElementById('analysisResults');
    currentImageDisplay = document.getElementById('currentImageDisplay');
    chatImagePreview = document.getElementById('chatImagePreview');
    changeImageBtn = document.getElementById('changeImageBtn');
    regenerateBtn = document.getElementById('regenerateBtn');
    
    // 配置面板元素
    styleSelect = document.getElementById('styleSelect');
    currentConfigSpan = document.getElementById('currentConfig');
}

// 设置事件监听器
function setupEventListeners() {
    // 文件上传处理
    uploadArea.addEventListener('click', () => imageInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('bg-gray-100');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('bg-gray-100');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('bg-gray-100');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });

    // 图片更换功能
    changeImageBtn.addEventListener('click', () => {
        imageInput.click();
    });
    
    // 重新生成功能
    regenerateBtn.addEventListener('click', () => {
        if (currentAnalysisImage) {
            startAutomaticAnalysis(currentAnalysisImage);
        }
    });
    
    // 配置选择框事件 - 选择时自动应用配置
    styleSelect.addEventListener('change', applyConfiguration);
    
    // 初始化配置显示
    updateConfigDisplay();
}



// 文件选择处理
function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        previewImage.classList.remove('hidden');
        
        // 设置分析图片
        currentAnalysisImage = e.target.result;
        chatImagePreview.src = e.target.result;
        currentImageDisplay.classList.remove('hidden');
        
        // 显示分析状态
        showAnalysisStatus('图片已上传，正在分析中...');
        
        // 自动开始分析
        startAutomaticAnalysis(e.target.result);
    };
    reader.readAsDataURL(file);
}

// 自动分析图片
async function startAutomaticAnalysis(imageData) {
    showLoading(true);
    
    try {
        // 使用配置中的系统提示词作为分析提示词
        const config = getPreprocessingConfig();
        const analysisPrompt = config.SYSTEM_PROMPT;
        
        console.log('使用分析提示词:', analysisPrompt);
        console.log('当前配置:', config);
        
        const response = await analyzeImageWithGemini(analysisPrompt, imageData);
        displayAnalysisResults(response);
    } catch (error) {
        console.error('分析失败:', error);
        console.error('错误详情:', error.message);
        showAnalysisError(`分析失败：${error.message}。请检查网络连接或稍后重试。`);
    } finally {
        showLoading(false);
    }
}



// Gemini API 图像分析功能
async function analyzeImageWithGemini(analysisPrompt, imageData) {
    const base64Data = imageData.split(',')[1];
    
    // 应用预处理：添加系统提示和语言要求
    const systemPrompt = API_CONFIG.PREPROCESSING.SYSTEM_PROMPT;
    const fullPrompt = `${systemPrompt}\n\n${analysisPrompt}`;
    
    const requestBody = {
        contents: [{
            parts: [
                {text: fullPrompt},
                {
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: base64Data
                    }
                }
            ]
        }],
        generationConfig: {
            temperature: API_CONFIG.PREPROCESSING.TEMPERATURE,
            topK: 32,
            topP: 1,
            maxOutputTokens: API_CONFIG.PREPROCESSING.MAX_TOKENS,
        }
    };

    // 尝试主要端点，如果失败则尝试备用端点
    const endpoints = [API_CONFIG.GEMINI_ENDPOINT, API_CONFIG.FALLBACK_ENDPOINT];
    
    for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        console.log(`尝试API端点 ${i + 1}:`, endpoint);
        
        try {
            const response = await fetch(`${endpoint}?key=${API_CONFIG.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API错误响应:', errorText);
                
                // 如果是最后一个端点，抛出错误
                if (i === endpoints.length - 1) {
                    throw new Error(`API请求失败 (${response.status}): ${errorText}`);
                }
                // 否则继续尝试下一个端点
                continue;
            }

            const data = await response.json();
            console.log('API响应数据:', data);

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                console.error('API响应格式错误:', data);
                if (i === endpoints.length - 1) {
                    throw new Error('API响应格式不正确');
                }
                continue;
            }

            const responseText = data.candidates[0].content.parts[0].text;
            return responseText;
            
        } catch (error) {
            console.error(`端点 ${i + 1} 失败:`, error);
            if (i === endpoints.length - 1) {
                throw error;
            }
        }
    }
}



// 显示分析状态
function showAnalysisStatus(message) {
    analysisResults.innerHTML = `
        <div class="text-center text-blue-600">
            <div class="mb-4">
                <div class="loading-spinner rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <p class="text-lg font-medium">${message}</p>
        </div>
    `;
}

// 显示分析结果
function displayAnalysisResults(result) {
    analysisResults.innerHTML = `
        <div class="analysis-result">
            <div class="mb-4 flex items-center justify-between">
                <h4 class="text-lg font-semibold text-gray-800">分析完成</h4>
                <span class="text-sm text-gray-500">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="prose max-w-none">
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div class="whitespace-pre-wrap text-gray-700 leading-relaxed">${result}</div>
                </div>
            </div>
        </div>
    `;
}

// 显示分析错误
function showAnalysisError(errorMessage) {
    analysisResults.innerHTML = `
        <div class="text-center text-red-600">
            <div class="mb-4">
                <svg class="w-16 h-16 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <p class="text-lg font-medium mb-2">分析失败</p>
            <p class="text-sm">${errorMessage}</p>
        </div>
    `;
}

// 显示/隐藏加载状态
function showLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

// 错误处理
window.addEventListener('error', function(e) {
    console.error('应用错误:', e.error);
    showLoading(false);
});

// 配置管理函数
function updatePreprocessingConfig(newConfig) {
    Object.assign(API_CONFIG.PREPROCESSING, newConfig);
    console.log('预处理配置已更新:', API_CONFIG.PREPROCESSING);
    updateConfigDisplay();
}

// 应用配置
function applyConfiguration() {
    const style = styleSelect.value;
    
    // 只根据风格生成配置键（语言固定为中文）
    const configKey = `chinese-${style}`;
    
    const success = applyPresetConfig(configKey);
    if (success) {
        console.log(`配置已自动应用：中文 + ${styleSelect.options[styleSelect.selectedIndex].text}`);
    }
}



// 更新配置显示
function updateConfigDisplay() {
    const config = getPreprocessingConfig();
    const maxTokens = config.MAX_TOKENS;
    
    let style = '简单';
    if (maxTokens >= 2000) style = '详细';
    
    currentConfigSpan.textContent = `中文 + ${style}`;
}

function getPreprocessingConfig() {
    return API_CONFIG.PREPROCESSING;
}

// 预设配置模板
const PRESET_CONFIGS = {
    // 中文简单
    'chinese-simple': {
        RESPONSE_LANGUAGE: 'Chinese',
        SYSTEM_PROMPT: '请用中文对这张图片进行简洁分析。要求：1) 用1-2句话概括图片主要内容 2) 只描述最明显的物体和场景 3) 回答控制在50字以内 4) 语言简洁直接',
        TEMPERATURE: 0.2,
        MAX_TOKENS: 512
    },
    // 中文详细
    'chinese-detailed': {
        RESPONSE_LANGUAGE: 'Chinese',
        SYSTEM_PROMPT: '请用中文对这张图片进行详细全面的分析。要求：1) 详细描述所有可见的物体、人物、动物 2) 分析颜色搭配和构图特点 3) 描述场景环境和氛围 4) 识别图片中的文字、符号、标识 5) 分析光线、阴影、质感等技术细节 6) 评估整体艺术风格和情感表达 7) 提供深入的专业见解 8) 回答在300-500字',
        TEMPERATURE: 0.6,
        MAX_TOKENS: 4096
    }
};

function applyPresetConfig(presetName) {
    if (PRESET_CONFIGS[presetName]) {
        updatePreprocessingConfig(PRESET_CONFIGS[presetName]);
        console.log(`已应用预设配置: ${presetName}`);
        return true;
    } else {
        console.error(`未找到预设配置: ${presetName}`);
        return false;
    }
}

// 导出函数供外部使用（如果需要）
window.GeminiAI = {
    handleFileSelect,
    startAutomaticAnalysis,
    analyzeImageWithGemini,
    testApiConnection,
    updatePreprocessingConfig,
    getPreprocessingConfig,
    applyPresetConfig,
    PRESET_CONFIGS,
    regenerateAnalysis: () => {
        if (currentAnalysisImage) {
            startAutomaticAnalysis(currentAnalysisImage);
        }
    }
};
