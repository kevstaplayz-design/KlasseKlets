 // Jouw eigen Firebase Database Config
        const firebaseConfig = {
          apiKey: "AIzaSyC3i176J8L_xdlxgV1dxmfIDUuu_6cjJk0",
          authDomain: "klasseklets.firebaseapp.com",
          projectId: "klasseklets",
          storageBucket: "klasseklets.firebasestorage.app",
          messagingSenderId: "450289310307",
          appId: "1:450289310307:web:e3711f47879f3444f53656"
        };

        const FORBIDDEN_WORDS = [
            'kut', 'kk', 'kanker', 'tyfus', 'gvd', 'homo', 'hoer', 'lul', 'pik', 'neuken',
            'sex', 'porno', 'tieten', 'slet', 'klootzak', 'tering', 'verdomme', 'fuck'
        ];

        let db;

        try { 
            firebase.initializeApp(firebaseConfig); 
            db = firebase.firestore(); 
        } catch (e) { 
            console.error("Firebase error:", e); 
        }

        const EMOJI_OPTIONS = [
            { icon: 'smile', label: 'Grappig', color: 'bg-yellow-50 border-yellow-200', textClass: 'text-yellow-600' },
            { icon: 'star', label: 'Belangrijk', color: 'bg-purple-50 border-purple-200', textClass: 'text-purple-600' },
            { icon: 'zap', label: 'Spannend', color: 'bg-blue-50 border-blue-200', textClass: 'text-blue-600' },
            { icon: 'heart', label: 'Lief', color: 'bg-pink-50 border-pink-200', textClass: 'text-pink-600' },
            { icon: 'sparkles', label: 'Nieuws', color: 'bg-teal-50 border-teal-200', textClass: 'text-teal-600' },
        ];
        const TEXT_EMOJIS = ['😀', '😂', '🥰', '😎', '🥳', '😜', '👍', '❤️', '✨', '🔥', '🎉', '⚽', '🎨', '🚀', '🐶', '🍕'];

        let isTeacher = false;
        let selectedTheme = EMOJI_OPTIONS[0];
        let currentMessages = [];
        let currentReports = [];
        let activeView = 'chat';
        let activeReadItem = null;
        let itemToDelete = null; // Voor de wisfunctie

        window.addEventListener('load', () => {
            lucide.createIcons();
            renderThemes();
            renderEmojiPicker();
            
            if (db) {
                setupDatabaseListeners();
            }
        });

        function setupDatabaseListeners() {
            db.collection("berichten").onSnapshot((snapshot) => {
                let fetched = [];
                snapshot.forEach((doc) => { fetched.push({ id: doc.id, ...doc.data() }); });
                fetched.sort((a, b) => (b.timestamp?.toMillis() || Date.now()) - (a.timestamp?.toMillis() || Date.now()));
                currentMessages = fetched;
                if(activeView === 'chat') updateUI();
                document.getElementById('loading-state').classList.add('hidden');
            }, (error) => console.error("Error berichten:", error));

            db.collection("verslagen").onSnapshot((snapshot) => {
                let fetched = [];
                snapshot.forEach((doc) => { fetched.push({ id: doc.id, ...doc.data() }); });
                fetched.sort((a, b) => (b.timestamp?.toMillis() || Date.now()) - (a.timestamp?.toMillis() || Date.now()));
                currentReports = fetched;
                if(activeView === 'reports') updateUI();
            }, (error) => console.error("Error verslagen:", error));
        }

        function switchView(view) {
            activeView = view;
            const isChat = view === 'chat';
            document.getElementById('chat-view').classList.toggle('hidden', !isChat);
            document.getElementById('reports-view').classList.toggle('hidden', isChat);
            
            const btnChat = document.getElementById('nav-chat');
            const btnReports = document.getElementById('nav-reports');
            
            btnChat.className = isChat ? 'flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all bg-white text-purple-600 shadow-sm' : 'flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all hover:bg-white/10 text-white';
            btnReports.className = !isChat ? 'flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all bg-white text-indigo-600 shadow-sm' : 'flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all hover:bg-white/10 text-white';
            
            updateUI();
        }

        function updateUI() {
            if(activeView === 'chat') {
                renderMessages(currentMessages);
                document.getElementById('empty-state').classList.toggle('hidden', currentMessages.length > 0);
            } else {
                renderReports(currentReports);
                document.getElementById('reports-empty-state').classList.toggle('hidden', currentReports.length > 0);
            }
        }

        function renderThemes() {
            document.getElementById('theme-options').innerHTML = EMOJI_OPTIONS.map(opt => `
                <button type="button" onclick="setTheme('${opt.label}')" 
                    class="p-2.5 px-4 rounded-xl border-2 flex items-center gap-2 text-xs font-bold transition-all shadow-sm ${selectedTheme.label === opt.label ? opt.color + ' border-current' : 'bg-white border-slate-50 opacity-60'}">
                    <i data-lucide="${opt.icon}" class="${opt.textClass} w-4 h-4"></i> ${opt.label}
                </button>
            `).join('');
            lucide.createIcons();
        }

        function renderEmojiPicker() {
            document.getElementById('emoji-picker').innerHTML = TEXT_EMOJIS.map(e => `
                <button type="button" onclick="addEmoji('${e}')" class="text-2xl hover:scale-125 transition-transform p-1.5 focus:outline-none">${e}</button>
            `).join('');
        }

        function renderMessages(docs) {
            document.getElementById('messages-container').innerHTML = docs.map(msg => {
                const emojiObj = EMOJI_OPTIONS.find(e => e.label === msg.emojiLabel) || EMOJI_OPTIONS[0];
                const dateStr = msg.timestamp ? new Date(msg.timestamp.toMillis()).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'}) : 'Zojuist';
                return `
                    <div class="message-card bg-white rounded-3xl p-6 shadow-sm border-2 ${msg.colorClass} relative overflow-hidden group">
                        <div class="flex items-start gap-4 relative z-10">
                            <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-50">
                                <i data-lucide="${emojiObj.icon}" class="${emojiObj.textClass} w-7 h-7"></i>
                            </div>
                            <div class="flex-1">
                                <div class="flex justify-between items-baseline mb-2">
                                    <h3 class="font-bold text-slate-800">${msg.author}</h3>
                                    <div class="flex items-center gap-3">
                                        <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${dateStr}</span>
                                        ${isTeacher ? `<button type="button" onclick="openDeleteModal('berichten', '${msg.id}')" class="text-red-500 hover:bg-red-100 bg-red-50 px-3 py-1 rounded-full font-bold text-[10px] uppercase transition-colors cursor-pointer relative z-20">Wis</button>` : ''}
                                    </div>
                                </div>
                                <p class="text-slate-600 text-[15px] whitespace-pre-wrap leading-relaxed">${msg.text}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            lucide.createIcons();
        }

        function renderReports(docs) {
            document.getElementById('reports-grid').innerHTML = docs.map(report => {
                const dateShort = report.timestamp ? new Date(report.timestamp.toMillis()).toLocaleDateString('nl-NL', {day:'numeric', month:'short'}) : 'Vandaag';
                
                let cardTitle = 'Dagverslag';
                let titleColor = 'text-indigo-500';

                if (report.type === 'mop') {
                    cardTitle = 'Leuke Mop';
                    titleColor = 'text-yellow-500';
                    return `
                    <div class="flex flex-col items-center gap-2 relative">
                        <span class="text-[10px] font-black ${titleColor} uppercase tracking-widest text-center w-full truncate">${cardTitle}</span>
                        <div onclick="openReport('${report.id}')" class="joke-card">
                            <span class="text-4xl">😂</span>
                            <div class="absolute -top-2 -right-2 bg-yellow-400 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-sm">MOP</div>
                        </div>
                        <div class="text-center mt-1 flex flex-col items-center gap-2">
                            <p class="font-black text-slate-700 text-sm truncate w-28 uppercase tracking-tighter">${report.author}</p>
                            ${isTeacher ? `<button type="button" onclick="openDeleteModal('verslagen', '${report.id}')" class="text-red-500 hover:bg-red-100 bg-red-50 px-3 py-1 rounded-full font-bold text-[9px] uppercase transition-colors cursor-pointer relative z-20">Wis</button>` : ''}
                        </div>
                    </div>
                    `;
                }

                let extraClasses = '';
                let specialIcon = '';
                if (report.type === 'milou-vraag') {
                    cardTitle = 'Vraag voor Milou';
                    titleColor = 'text-purple-500';
                    extraClasses = 'envelope-milou';
                }
                if (report.type === 'milou-special') {
                    cardTitle = 'Bericht van Milou';
                    titleColor = 'text-amber-500';
                    extraClasses = 'envelope-gold';
                    specialIcon = '<div class="absolute -top-3 -left-3 rotate-[-20deg] text-2xl z-20">👑</div>';
                }

                return `
                <div class="flex flex-col items-center gap-2 relative">
                    <span class="text-[10px] font-black ${titleColor} uppercase tracking-widest text-center w-full truncate">${cardTitle}</span>
                    <div onclick="openReport('${report.id}')" class="envelope ${extraClasses} flex flex-col items-center justify-center pb-2">
                        ${specialIcon}
                        <span class="text-xs font-black text-indigo-200 z-10 opacity-60 mb-2 uppercase tracking-tighter">${dateShort}</span>
                        <div class="bg-indigo-500 w-7 h-7 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center">
                            <span class="text-[10px] text-white font-bold">${report.mood || '😊'}</span>
                        </div>
                    </div>
                    <div class="text-center mt-1 flex flex-col items-center gap-2">
                        <p class="font-black text-slate-700 text-sm truncate w-28 uppercase tracking-tighter">${report.author}</p>
                        ${isTeacher ? `<button type="button" onclick="openDeleteModal('verslagen', '${report.id}')" class="text-red-500 hover:bg-red-100 bg-red-50 px-3 py-1 rounded-full font-bold text-[9px] uppercase transition-colors cursor-pointer relative z-20">Wis</button>` : ''}
                    </div>
                </div>
            `}).join('');
            lucide.createIcons();
        }

        // Modals Management
        function openSelectionModal() { document.getElementById('selection-modal').classList.remove('hidden'); }
        function closeSelectionModal() { document.getElementById('selection-modal').classList.add('hidden'); }
        
        function openMilouAccess() { closeSelectionModal(); document.getElementById('milou-modal').classList.remove('hidden'); }
        function closeMilouAccess() { 
            document.getElementById('milou-modal').classList.add('hidden'); 
            document.getElementById('milou-pin').value = ''; 
            document.getElementById('milou-pin-error').classList.add('hidden');
        }
        
        function handleMilouLogin(e) {
            if(e) e.preventDefault();
            if(document.getElementById('milou-pin').value === '2026') {
                document.getElementById('milou-pin-error').classList.add('hidden');
                closeMilouAccess();
                toggleCompose(true, 'milou-special');
            } else {
                document.getElementById('milou-pin-error').classList.remove('hidden');
                setTimeout(() => document.getElementById('milou-pin-error').classList.add('hidden'), 2000);
            }
        }

        function toggleCompose(show, type = 'chat') { 
            closeSelectionModal();
            const modal = document.getElementById('compose-modal');
            if (show) {
                const isReport = type === 'report';
                const isMop = type === 'mop';
                const isMilouVraag = type === 'milou-vraag';
                const isMilouSpecial = type === 'milou-special';
                const isChat = type === 'chat';

                document.getElementById('post-type').value = type;
                
                // Show/hide appropriate fields
                document.getElementById('joke-fields').classList.toggle('hidden', !isMop);
                document.getElementById('text-field').classList.toggle('hidden', isMop);
                document.getElementById('chat-extras').classList.toggle('hidden', !isChat);
                document.getElementById('mood-selector').classList.toggle('hidden', !isReport);
                document.getElementById('report-prompts').classList.toggle('hidden', !isReport);
                
                const header = document.getElementById('modal-header');
                const btn = document.getElementById('submit-btn');
                const textInput = document.getElementById('text-input');
                const jokeInput = document.getElementById('joke-input');
                const clouInput = document.getElementById('clou-input');

                // Toggle required tags
                if (isMop) {
                    textInput.removeAttribute('required');
                    jokeInput.setAttribute('required', 'true');
                    clouInput.setAttribute('required', 'true');
                } else {
                    textInput.setAttribute('required', 'true');
                    jokeInput.removeAttribute('required');
                    clouInput.removeAttribute('required');
                }

                // Styling headers and buttons
                if (isReport) {
                    document.getElementById('modal-title').innerText = 'Dagverslag schrijven';
                    header.className = 'bg-indigo-600 p-5 px-6 flex justify-between items-center text-white';
                    btn.className = 'w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group';
                    document.getElementById('message-label').innerText = 'Jouw verhaal';
                    textInput.placeholder = 'Vandaag was een...';
                } else if (isMop) {
                    document.getElementById('modal-title').innerText = 'Mop vertellen';
                    header.className = 'bg-yellow-500 p-5 px-6 flex justify-between items-center text-white';
                    btn.className = 'w-full py-4 rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group';
                } else if (isMilouVraag) {
                    document.getElementById('modal-title').innerText = 'Vraag voor Milou';
                    header.className = 'bg-purple-500 p-5 px-6 flex justify-between items-center text-white';
                    btn.className = 'w-full py-4 rounded-2xl bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group';
                    document.getElementById('message-label').innerText = 'Jouw vraag';
                    textInput.placeholder = 'Wat wil je vragen aan Milou?';
                } else if (isMilouSpecial) {
                    document.getElementById('modal-title').innerText = 'Alleen voor Milou';
                    header.className = 'bg-amber-500 p-5 px-6 flex justify-between items-center text-white';
                    btn.className = 'w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group';
                    document.getElementById('message-label').innerText = 'Jouw bericht';
                    textInput.placeholder = 'Vertel je klas hoe het gaat...';
                } else if (isChat) {
                    document.getElementById('modal-title').innerText = 'Nieuw berichtje';
                    header.className = 'bg-purple-600 p-5 px-6 flex justify-between items-center text-white';
                    btn.className = 'w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group';
                    document.getElementById('message-label').innerText = 'Bericht';
                    textInput.placeholder = 'Wat wil je vertellen?';
                }
                
                setMood('😊');
                lucide.createIcons();
            }
            modal.classList.toggle('hidden', !show); 
        }

        function setMood(mood) {
            document.getElementById('mood-input').value = mood;
            document.querySelectorAll('.mood-btn').forEach(btn => {
                btn.classList.toggle('scale-150', btn.getAttribute('data-mood') === mood);
                btn.classList.toggle('grayscale', btn.getAttribute('data-mood') !== mood);
            });
        }

        function insertPrompt(text) {
            const textarea = document.getElementById('text-input');
            textarea.value = text + textarea.value;
            textarea.focus();
        }

        function setTheme(label) { selectedTheme = EMOJI_OPTIONS.find(e => e.label === label); renderThemes(); }
        function toggleEmojiPicker() { document.getElementById('emoji-picker').classList.toggle('hidden'); }
        function addEmoji(emoji) { document.getElementById('text-input').value += emoji; document.getElementById('text-input').focus(); }

        // Veiligheids filter
        function containsBadWords(text) {
            if (!text) return false;
            const cleanText = text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '');
            return FORBIDDEN_WORDS.some(word => cleanText.includes(word));
        }

        let warningTimeout;
        function showBigWarning() {
            const overlay = document.getElementById('big-warning-overlay');
            const progress = document.getElementById('warning-progress');
            clearTimeout(warningTimeout);
            overlay.classList.remove('hidden');
            progress.style.transition = 'none';
            progress.style.width = '100%';
            setTimeout(() => {
                progress.style.transition = 'width 3000ms linear';
                progress.style.width = '0%';
            }, 50);
            warningTimeout = setTimeout(() => { overlay.classList.add('hidden'); }, 3000);
        }

        // Verzenden Data (Aangepast zodat het Google Sites proof is zonder alerts!)
        function handleMessageSubmit(e) {
            e.preventDefault();

            const type = document.getElementById('post-type').value;
            const author = document.getElementById('author-input').value.trim();
            const text = document.getElementById('text-input').value.trim();
            const joke = document.getElementById('joke-input').value.trim();
            const clou = document.getElementById('clou-input').value.trim();
            
            if (containsBadWords(author) || containsBadWords(text) || containsBadWords(joke) || containsBadWords(clou)) {
                showBigWarning();
                return;
            }
            
            const btn = document.getElementById('submit-btn');
            const originalContent = btn.innerHTML;
            btn.innerHTML = "Momentje...";
            btn.disabled = true;
            
            const collection = type === 'chat' ? 'berichten' : 'verslagen';
            const data = {
                type: type,
                author,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            if(type === 'chat') {
                data.text = text;
                data.emojiLabel = selectedTheme.label;
                data.colorClass = selectedTheme.color;
            } else if (type === 'mop') {
                data.joke = joke;
                data.clou = clou;
            } else if (type === 'milou-vraag') {
                data.text = text;
                data.mood = '💜';
            } else if (type === 'milou-special') {
                data.text = text;
                data.mood = '👑';
            } else {
                data.text = text;
                data.mood = document.getElementById('mood-input').value;
            }

            db.collection(collection).add(data)
            .then(() => {
                toggleCompose(false);
                document.getElementById('author-input').value = '';
                document.getElementById('text-input').value = '';
                document.getElementById('joke-input').value = '';
                document.getElementById('clou-input').value = '';
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                btn.disabled = false;
                btn.innerHTML = originalContent;
            })
            .catch((error) => {
                console.error(error);
                // Geen alert gebruiken, we veranderen gewoon de knop tekst!
                btn.innerHTML = "Oeps! Foutje. Probeer opnieuw.";
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = originalContent;
                }, 3000);
            });
        }

        // Lees Pop-ups
        function openReport(id) {
            const r = currentReports.find(x => x.id === id);
            if(!r) return;
            activeReadItem = r;

            document.getElementById('read-author').innerText = r.author;
            document.getElementById('read-date').innerText = r.timestamp ? new Date(r.timestamp.toMillis()).toLocaleDateString('nl-NL') : 'Vandaag';
            
            const clouEl = document.getElementById('read-clou');
            const hintEl = document.getElementById('tap-hint');
            clouEl.classList.add('hidden');
            hintEl.classList.add('hidden');

            if (r.type === 'mop') {
                document.getElementById('read-mood-container').innerText = '😂';
                document.getElementById('read-text').innerText = r.joke;
                clouEl.innerText = r.clou;
                hintEl.classList.remove('hidden');
            } else if (r.type === 'milou-special') {
                document.getElementById('read-mood-container').innerText = '👑';
                document.getElementById('read-text').innerText = r.text;
                confetti({ particleCount: 150, spread: 70, colors: ['#fbbf24', '#ffffff'], origin: {y: 0.6} });
            } else if (r.type === 'milou-vraag') {
                document.getElementById('read-mood-container').innerText = '💜';
                document.getElementById('read-text').innerText = r.text;
            } else {
                document.getElementById('read-mood-container').innerText = r.mood || '😊';
                document.getElementById('read-text').innerText = r.text;
            }

            document.getElementById('read-modal').classList.remove('hidden');
        }

        function handleReadClick() {
            if (activeReadItem && activeReadItem.type === 'mop') {
                const clou = document.getElementById('read-clou');
                if (clou.classList.contains('hidden')) {
                    clou.classList.remove('hidden');
                    document.getElementById('tap-hint').classList.add('hidden');
                    confetti({ particleCount: 50, colors: ['#facc15', '#ffffff'] });
                }
            }
        }

        function closeReadModal() { document.getElementById('read-modal').classList.add('hidden'); activeReadItem = null; }
        
        // --- LERAAR & VERWIJDEREN LOGICA ---
        function handleLockClick() { 
            if (isTeacher) {
                // We zijn ingelogd, dus bij klik loggen we veilig uit!
                isTeacher = false;
                document.getElementById('lock-btn').classList.remove('text-green-400');
                document.getElementById('lock-btn').classList.add('text-white/30');
                document.getElementById('lock-icon').setAttribute('data-lucide', 'lock');
                lucide.createIcons();
                updateUI(); // Dit haalt de wis-knopjes weer netjes weg!
            } else {
                // Niet ingelogd, toon het pin-scherm
                document.getElementById('teacher-modal').classList.remove('hidden'); 
                document.getElementById('pin-input').value = '';
                document.getElementById('pin-error').classList.add('hidden');
            }
        }
        
        function closeTeacherModal() { 
            document.getElementById('teacher-modal').classList.add('hidden'); 
        }

        function handleTeacherLogin(e) {
            e.preventDefault();
            if(document.getElementById('pin-input').value === '4286') {
                isTeacher = true;
                closeTeacherModal();
                updateUI(); // Zet de prullenbakjes zichtbaar!
                document.getElementById('lock-btn').classList.remove('text-white/30');
                document.getElementById('lock-btn').classList.add('text-green-400');
                document.getElementById('lock-icon').setAttribute('data-lucide', 'unlock');
                lucide.createIcons();
            } else {
                document.getElementById('pin-error').classList.remove('hidden');
            }
        }

        // Google-sites proof verwijderen zonder browser block!
        function openDeleteModal(coll, id) {
            itemToDelete = { coll, id };
            document.getElementById('delete-error').classList.add('hidden');
            document.getElementById('delete-modal').classList.remove('hidden');
        }

        function closeDeleteModal() {
            document.getElementById('delete-modal').classList.add('hidden');
            itemToDelete = null;
        }

        function executeDelete() {
            if(!itemToDelete) return;
            const { coll, id } = itemToDelete;
            const btn = document.getElementById('confirm-delete-btn');
            
            btn.disabled = true;
            btn.innerHTML = "Wissen...";

            db.collection(coll).doc(id).delete()
            .then(() => {
                closeDeleteModal();
                btn.disabled = false;
                btn.innerHTML = "Ja, wis het!";
            })
            .catch((error) => {
                console.error("Fout bij verwijderen:", error);
                document.getElementById('delete-error').classList.remove('hidden');
                btn.disabled = false;
                btn.innerHTML = "Ja, wis het!";
            });
        }
