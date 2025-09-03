const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// CORS 허용
app.use(cors());
app.use(express.json());

// Claude API 프록시 엔드포인트
app.post('/api/translate', async (req, res) => {
    try {
        const { query, targetLanguage } = req.body;
        
        console.log(`번역 요청: "${query}" -> ${targetLanguage}`);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY || '',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 100,
                messages: [{
                    role: 'user',
                    content: `다음 한국어 검색어를 ${getLanguageName(targetLanguage)}로 자연스럽게 번역해주세요. 번역된 결과만 답변해주세요.\n\n검색어: "${query}"`
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API 오류: ${response.status}`);
        }

        const data = await response.json();
        const translatedText = data.content[0].text.trim();
        
        console.log(`번역 완료: "${query}" -> "${translatedText}"`);
        
        res.json({ 
            success: true, 
            translatedText,
            originalQuery: query,
            targetLanguage 
        });
        
    } catch (error) {
        console.error('번역 오류:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            translatedText: req.body.query // 실패 시 원본 반환
        });
    }
});

function getLanguageName(code) {
    const languages = {
        'ko': '한국어',
        'en': 'English',
        'ja': '日本語',
        'zh': '中文',
        'es': 'Español',
        'fr': 'Français',
        'de': 'Deutsch',
        'it': 'Italiano',
        'pt': 'Português',
        'ru': 'Русский'
    };
    return languages[code] || 'English';
}

app.listen(PORT, () => {
    console.log(`🚀 프록시 서버가 http://localhost:${PORT}에서 실행 중입니다.`);
    console.log(`📡 Claude API 번역 엔드포인트: POST /api/translate`);
});
