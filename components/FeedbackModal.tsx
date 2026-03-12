import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquare, AlertCircle, Lightbulb, CheckCircle2 } from 'lucide-react';

export default function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'suggestion' | 'issue' | 'other'>('suggestion');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-feedback', handleOpen);
    return () => window.removeEventListener('open-feedback', handleOpen);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => {
          setIsSuccess(false);
          setMessage('');
          setEmail('');
          setType('suggestion');
        }, 300);
      }, 2000);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-xl flex flex-col overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
          >
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-gray-900 dark:text-white">Send Feedback</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Help us improve the Emergency Portal</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                aria-label="Close modal" 
                className="p-3 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
              >
                <X className="w-6 h-6 text-gray-800 dark:text-gray-200" />
              </button>
            </div>

            <div className="p-8">
              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <h4 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Thank You!</h4>
                  <p className="text-xl text-gray-500 dark:text-gray-400">Your feedback has been submitted successfully.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Feedback Type</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setType('suggestion')}
                        className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold ${
                          type === 'suggestion' 
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500' 
                            : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Lightbulb className="w-5 h-5" />
                        Suggestion
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('issue')}
                        className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold ${
                          type === 'issue' 
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-500' 
                            : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <AlertCircle className="w-5 h-5" />
                        Report Issue
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                      {type === 'suggestion' ? 'Your Suggestion' : 'Describe the Issue'} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={type === 'suggestion' ? "How can we improve the portal?" : "What went wrong?"}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 text-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none h-32 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="For follow-up questions"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 text-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full bg-yellow-500 text-white font-bold py-5 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-600 transition-all text-xl shadow-xl shadow-yellow-100 dark:shadow-none flex items-center justify-center gap-3 active:scale-95"
                  >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-6 h-6" />
                        Submit Feedback
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
