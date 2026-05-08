import React, { useState, useEffect } from 'react';
import novelData from './data.json';

const ReaderApp = () => {
  // 初始化状态：尝试从本地存储读取进度，否则默认第一章 L2 难度
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [level, setLevel] = useState('L2'); // 初始设为中等难度
  const [showQuiz, setShowQuiz] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [wrongQuestions, setWrongQuestions] = useState([]); // 错题索引
  const [nextAction, setNextAction] = useState(''); // 下一步操作提示
  const [showResultModal, setShowResultModal] = useState(false); // 结果弹窗
  const [pendingAction, setPendingAction] = useState(null); // 待执行的操作
  const [modalQuizData, setModalQuizData] = useState(null); // 弹窗显示的quiz数据（提交时的快照）
  const [clickedWords, setClickedWords] = useState(() => {
    // 从 localStorage 读取已点击过的单词
    try {
      const saved = localStorage.getItem('clickedWords');
      return new Set(JSON.parse(saved || '[]'));
    } catch {
      return new Set();
    }
  }); // 记录已点击查询的单词

  const currentChapter = novelData.chapters[currentChapterIdx];
  const content = currentChapter.contents[level];

  // 单词点击处理：简单的划词翻译逻辑
  const handleWordClick = (word) => {
    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase();
    const translation = novelData.dictionary[cleanWord] || 
                       novelData.dictionary[Object.keys(novelData.dictionary).find(k => k.toLowerCase() === cleanWord)];
    if (translation) {
      alert(`${cleanWord}: ${translation}`);
      // 记录已点击的单词
      setClickedWords(prev => {
        const next = new Set(prev);
        next.add(cleanWord);
        try {
          localStorage.setItem('clickedWords', JSON.stringify(Array.from(next)));
        } catch (e) {
          console.warn('Failed to save clicked words to localStorage:', e);
        }
        return next;
      });
    }
  };

   // 提交 Quiz 并计算难度调整
  const submitQuiz = () => {
    try {
      // Guard: no quiz data or empty
      if (!content?.quiz || !Array.isArray(content.quiz) || content.quiz.length === 0) {
        alert('当前没有可用的测验题目，请切换章节或难度。');
        return;
      }

      // Capture the current quiz data BEFORE any state changes
      const currentQuiz = content.quiz;
      const currentLevel = level;

      let correctCount = 0;
      const wrongIndices = []; // 错题索引

      currentQuiz.forEach((q, idx) => {
        if (!q || typeof q !== 'object') return;
        const userAnswer = userAnswers[idx];
        if (userAnswer === q.answerIndex) {
          correctCount++;
        } else {
          wrongIndices.push(idx);
        }
      });

      const finalScore = (correctCount / currentQuiz.length) * 100;
      setScore(finalScore);
      setWrongQuestions(wrongIndices); // 保存错题索引

      // 难度调整逻辑与下一步操作提示
      let nextLevel = currentLevel;
      let action = ''; // 下一步操作描述
      let executeAction = null; // 待执行的操作函数

      if (finalScore === 100) {
        if (currentLevel === 'L1') nextLevel = 'L2';
        else if (currentLevel === 'L2') nextLevel = 'L3';
        action = `完美！下一章将使用 ${nextLevel} 难度阅读。`;
        executeAction = () => {
          if (currentChapterIdx < novelData.chapters.length - 1) {
            setCurrentChapterIdx(prev => prev + 1);
            setLevel(nextLevel);
          } else {
            alert("恭喜！你已读完当前所有 Demo 章节。");
          }
        };
      } else if (finalScore < 60) {
        if (currentLevel === 'L3') {
          nextLevel = 'L2';
          action = `得分较低（${finalScore.toFixed(0)}%），接下来将降级到 ${nextLevel} 难度重读本章。`;
          executeAction = () => setLevel(nextLevel);
        } else if (currentLevel === 'L2') {
          nextLevel = 'L1';
          action = `得分较低（${finalScore.toFixed(0)}%），接下来将降级到 ${nextLevel} 难度重读本章。`;
          executeAction = () => setLevel(nextLevel);
        } else {
          action = `本章需要完全理解才能进入下一章（得分 ${finalScore.toFixed(0)}%），请继续尝试！`;
          executeAction = () => {}; // 留在当前章节 L1，无需操作
        }
      } else {
        action = `表现不错（${finalScore.toFixed(0)}%）！下一章将使用 ${nextLevel} 难度阅读。`;
        executeAction = () => {
          if (currentChapterIdx < novelData.chapters.length - 1) {
            setCurrentChapterIdx(prev => prev + 1);
            setLevel(nextLevel);
          } else {
            alert("恭喜！你已读完当前所有 Demo 章节。");
          }
        };
      }

      setNextAction(action);
      setPendingAction(executeAction);
      // Store the quiz data to show in modal (before level changes)
      setModalQuizData(currentQuiz);
      setShowResultModal(true);
    } catch (error) {
      console.error('submitQuiz error:', error);
      alert('发生错误: ' + error.message);
    }
  };

  // 关闭弹窗并执行下一步操作
  const handleModalOk = () => {
    setShowResultModal(false);
    // 重置 quiz 状态并执行操作
    setShowQuiz(false);
    setUserAnswers({});
    setScore(null);
    setWrongQuestions([]);
    setNextAction('');
    setPendingAction(null);
    setModalQuizData(null);
    window.scrollTo(0, 0);
    if (pendingAction) pendingAction();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-amber-50 min-h-screen font-serif">
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-center mb-8 border-b border-amber-200 pb-4">
        <h1 className="text-xl font-bold text-amber-900">{novelData.novelTitle}</h1>
        <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-sm font-sans">
          难度: {level}
        </span>
      </div>

      {!showQuiz ? (
        /* 阅读区域 */
        <div className="animate-fadeIn">
          <h2 className="text-2xl font-bold mb-6 text-center text-amber-800">
            第 {currentChapter.chapterId} 章：{currentChapter.titleZh}
          </h2>
          <div className="text-lg leading-relaxed text-gray-800 space-y-4">
            {content?.text ? content.text.split('\n').map((para, i) => (
              <p key={i}>
                {para.split(' ').map((word, j) => {
                  const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase();
                  // 检查单词是否在字典中（可查询）
                  const hasTranslation = novelData.dictionary[cleanWord] || 
                                        Object.keys(novelData.dictionary).some(k => k.toLowerCase() === cleanWord);
                  const isClicked = clickedWords.has(cleanWord);
                  return (
                    <span 
                      key={j} 
                      onClick={() => handleWordClick(word)}
                      className={`hover:bg-amber-200 cursor-help transition-colors rounded px-0.5 ${
                        hasTranslation 
                          ? 'font-bold text-amber-900' 
                          : ''
                      } ${isClicked ? 'underline decoration-amber-600' : ''}`}
                    >
                      {word}{' '}
                    </span>
                  );
                })}
              </p>
            )) : <p className="text-gray-500">该章节暂无内容。</p>}
          </div>
          <button 
            onClick={() => setShowQuiz(true)}
            className="mt-10 w-full py-4 bg-amber-700 text-white rounded-lg font-bold hover:bg-amber-800 transition-shadow shadow-lg"
          >
            完成阅读，开始测试
          </button>
        </div>
      ) : (
        /* Quiz 区域 */
        <div className="animate-slideUp">
          <h2 className="text-xl font-bold mb-6">阅读理解检查</h2>
          {content?.quiz && content.quiz.map((q, qIdx) => {
            // Guard against invalid question data
            if (!q || !q.options) return null;
            return (
              <div key={qIdx} className="mb-8 p-4 bg-white rounded-lg shadow-sm">
                <p className="font-bold mb-4">{qIdx + 1}. {q.question || ''}</p>
                <div className="space-y-2">
                  {(q.options || []).map((opt, oIdx) => (
                    <label key={oIdx} className="flex items-center space-x-3 p-2 border rounded hover:bg-amber-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`q-${qIdx}`} 
                        checked={userAnswers[qIdx] === oIdx}
                        onChange={() => setUserAnswers({...userAnswers, [qIdx]: oIdx})}
                        className="form-radio text-amber-700"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          
          <button 
            onClick={submitQuiz}
            disabled={!content?.quiz || Object.keys(userAnswers).length < content.quiz.length}
            className="w-full py-4 bg-green-700 text-white rounded-lg font-bold disabled:opacity-50 hover:bg-green-800"
          >
            提交答案
          </button>
        </div>
      )}

          {/* 结果弹窗 Modal */}
          {showResultModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* 弹窗标题 */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800">📊 测验结果</h2>
                </div>

                {/* 弹窗内容 */}
                <div className="px-6 py-4">
               {/* 得分 */}
               <div className={`p-4 rounded-lg text-center font-bold text-lg mb-4 ${
                 (typeof score === 'number' && score >= 60) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
               }`}>
                 得分: {(typeof score === 'number' ? score.toFixed(0) : '0')}%
               </div>

                  {/* 错题展示 - 使用提交时的快照数据 */}
                  {wrongQuestions.length > 0 && modalQuizData && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <h3 className="font-bold text-amber-900 mb-3">❌ 答错的题目：</h3>
                      {wrongQuestions.map((qIdx, displayIdx) => {
                        // Use the snapshot from submission time
                        const question = modalQuizData[qIdx];
                        if (!question) return null;
                        const userAnswer = userAnswers[qIdx];
                        const correctAnswer = question.answerIndex;
                        return (
                          <div key={qIdx} className="mb-3 p-3 bg-white rounded border-l-4 border-red-400">
                            <p className="font-medium text-gray-800 mb-2">
                              {displayIdx + 1}. {question.question}
                            </p>
                            <div className="space-y-1 text-sm">
                              {(question.options || []).map((opt, oIdx) => {
                                let color = 'text-gray-600';
                                let icon = '○';
                                if (oIdx === correctAnswer) {
                                  color = 'text-green-600 font-bold';
                                  icon = '✓';
                                } else if (oIdx === userAnswer && userAnswer !== correctAnswer) {
                                  color = 'text-red-600';
                                  icon = '✗';
                                }
                                return (
                                  <p key={oIdx} className={`${color}`}>
                                    {icon} {opt}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 下一步操作提示 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 font-medium">
                      📢 提示：{nextAction}
                    </p>
                  </div>
                </div>

                {/* 弹窗按钮 */}
                <div className="px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={handleModalOk}
                    className="w-full py-3 bg-amber-700 text-white rounded-lg font-bold hover:bg-amber-800 transition-colors"
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
};

export default ReaderApp;