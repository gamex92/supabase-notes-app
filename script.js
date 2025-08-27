document.addEventListener('DOMContentLoaded', async () => {
    // The global 'supabase' client is initialized by the host environment
    const supabase = window.supabase;

    const path = window.location.pathname;

    const showMessage = (id, message, isError = true) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = message;
            el.className = isError ? 'text-center text-red-500 text-sm mt-4' : 'text-center text-green-500 text-sm mt-4';
        }
    };

    // --- REDIRECT LOGIC ---
    const { data: { session } } = await supabase.auth.getSession();
    if (session && (path.endsWith('/') || path.endsWith('index.html'))) {
        window.location.href = './dashboard.html';
    } else if (!session && path.endsWith('dashboard.html')) {
        window.location.href = './index.html';
    }

    // --- AUTH FORM (index.html) ---
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = document.getElementById('submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            
            // First, try to sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

            if (signInError) {
                // If sign in fails, try to sign up
                const { error: signUpError } = await supabase.auth.signUp({ email, password });
                
                if (signUpError) {
                    showMessage('error-message', signUpError.message);
                } else {
                    showMessage('error-message', 'Account created! Please check your email for verification.', false);
                }
            } else {
                 window.location.href = './dashboard.html';
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In / Sign Up';
        });
    }

    // --- DASHBOARD (dashboard.html) ---
    if (path.endsWith('dashboard.html')) {
        const logoutBtn = document.getElementById('logout-btn');
        const noteForm = document.getElementById('note-form');
        const notesContainer = document.getElementById('notes-container');

        const fetchNotes = async () => {
            const { data: notes, error } = await supabase
                .from('notes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                notesContainer.innerHTML = '<p class=\'text-red-500\'>Could not fetch notes.</p>';
                return;
            }
            
            renderNotes(notes);
        };

        const renderNotes = (notes) => {
            notesContainer.innerHTML = '';
            if (notes.length === 0) {
                notesContainer.innerHTML = '<p class=\'text-gray-500 dark:text-gray-400 col-span-full text-center\'>You have no notes yet.</p>';
                return;
            }
            notes.forEach(note => {
                const noteEl = document.createElement('div');
                noteEl.className = 'note-card bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-all';
                noteEl.innerHTML = `
                    <p class='text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words'>${note.content}</p>
                    <button data-id='${note.id}' class='delete-btn mt-4 text-red-500 hover:text-red-700 text-xs'>Delete</button>
                `;
                notesContainer.appendChild(noteEl);
            });
        };

        noteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = document.getElementById('note-content').value;
            const { data: { user } } = await supabase.auth.getUser();

            if (!content || !user) return;

            const { error } = await supabase.from('notes').insert({ content: content, user_id: user.id });

            if (error) {
                alert('Error creating note: ' + error.message);
            } else {
                document.getElementById('note-content').value = '';
                fetchNotes();
            }
        });

        notesContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const noteId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this note?')) {
                    const { error } = await supabase.from('notes').delete().match({ id: noteId });
                    if (error) {
                        alert('Error deleting note: ' + error.message);
                    } else {
                        fetchNotes();
                    }
                }
            }
        });

        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = './index.html';
        });

        fetchNotes();
    }
});