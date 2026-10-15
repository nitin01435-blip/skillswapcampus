    // IMPORTANT:
    // This page is a normal Firebase web app, so use the browser CDN modules.
    // Do NOT import from bare specifiers such as "firebase/app" in a standalone HTML file.
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import {
      getAuth,
      signInWithCustomToken,
      onAuthStateChanged,
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      signOut
    } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import {
      getFirestore,
      collection,
      doc,
      setDoc,
      addDoc,
      getDoc,
      deleteDoc,
      onSnapshot
    } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

    // Firebase Web App configuration
    const firebaseConfig = {
      apiKey: "AIzaSyDfHED0UFJUyYcoTvGSKsQ5reIeHO2Fs4E",
      authDomain: "skillswapcampus-a227d.firebaseapp.com",
      projectId: "skillswapcampus-a227d",
      storageBucket: "skillswapcampus-a227d.firebasestorage.app",
      messagingSenderId: "913480785699",
      appId: "1:913480785699:web:08c247813274721d5df696",
      measurementId: "G-FJ0YD2NSB4"
    };

    // Initialize Firebase ONCE.
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Normal Firestore collections for this Firebase project.
    const getPublicCollection = (collName) => collection(db, collName);

    // Application Global State
    window.state = {
      users: [],
      matches: [],
      messages: [],
      sessions: [],
      currentUser: null,
      activeTab: 'dashboard',
      filterCategory: 'ALL',
      activeChatUser: null,
      callActive: false,
      callStream: null,
      isMicMuted: false,
      isCamOff: false,
      matchesFilter: 'active'
    };

    // Stable Firestore document id for every student.
    // One email = one permanent profile document, so a new login never replaces another student.
    const makeUserDocId = (email) => encodeURIComponent(email.trim().toLowerCase());

    async function initFirebaseAndApp() {
      // IMPORTANT: do not create an anonymous account on every device.
      // Firebase Auth now keeps the real student's login session and Firestore keeps
      // every student's profile independently.
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (err) {
        console.warn("Initial Firebase auth token was not available:", err);
      }

      const savedUserEmail = sessionStorage.getItem('skillswap_user_email');
      startRealtimeListeners(savedUserEmail);

      // Firebase Auth restores a registered student's login automatically on refresh.
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser || firebaseUser.isAnonymous) return;

        try {
          const profileSnap = await getDoc(doc(getPublicCollection('users'), makeUserDocId(firebaseUser.email)));
          if (profileSnap.exists()) {
            window.state.currentUser = { id: profileSnap.id, ...profileSnap.data() };
            sessionStorage.setItem('skillswap_user_email', firebaseUser.email);
            updateUI();
          }
        } catch (err) {
          console.warn("Could not restore student profile:", err);
        }
      });
    }

    function startRealtimeListeners(savedUserEmail) {
      // ONE realtime listener for the complete users collection.
      // It receives ALL student documents; nothing is deleted when another student logs in.
      onSnapshot(getPublicCollection('users'), (snapshot) => {
        const fetchedUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        window.state.users = fetchedUsers;

        // Seed demo profiles only once when the collection is genuinely empty.
        if (fetchedUsers.length === 0) {
          seedInitialCampusUsers();
        }

        if (savedUserEmail && !window.state.currentUser) {
          const matched = fetchedUsers.find(u => u.email?.toLowerCase() === savedUserEmail.toLowerCase());
          if (matched) window.state.currentUser = matched;
        }

        // If a real Firebase Auth user is active, prefer that user's profile.
        if (auth.currentUser && !auth.currentUser.isAnonymous) {
          const matched = fetchedUsers.find(u => u.email?.toLowerCase() === auth.currentUser.email?.toLowerCase());
          if (matched) window.state.currentUser = matched;
        }

        updateUI();
      }, (err) => console.error("Firestore users snapshot error:", err));

      onSnapshot(getPublicCollection('matches'), (snapshot) => {
        window.state.matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        updateUI();
      }, (err) => console.error("Firestore matches snapshot error:", err));

      onSnapshot(getPublicCollection('messages'), (snapshot) => {
        window.state.messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        updateUI();
      }, (err) => console.error("Firestore messages snapshot error:", err));

      onSnapshot(getPublicCollection('sessions'), (snapshot) => {
        window.state.sessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        updateUI();
      }, (err) => console.error("Firestore sessions snapshot error:", err));
    }

    async function seedInitialCampusUsers() {
      const demoUsers = [
        {
          fullName: "Nitin Maurya",
          email: "nitin@campus.edu",
          course: "B.Tech Computer Science",
          year: "2nd Year",
          skillsTeach: ["Python", "React", "Data Structures"],
          skillsLearn: ["Figma", "UI/UX", "Public Speaking"],
          bio: "CS student passionate about open source and web application development.",
          sessionsCompleted: 12,
          rating: 4.9,
          createdAt: Date.now() - 86400000 * 5
        },
        {
          fullName: "utkarsh tripathi",
          email: "utkarsh@campus.edu",
          course: "B.Tech Computer Science",
          year: "2nd Year",
          skillsTeach: ["Data Structures"],
          skillsLearn: [ "Public Speaking"],
          bio: "CS student passionate about open source and web application development.",
          sessionsCompleted: 12,
          rating: 4.9,
          createdAt: Date.now() - 86400000 * 5
        },
        {
          fullName: "Rohan Verma",
          email: "rohan@campus.edu",
          course: "MBA Business",
          year: "1st Year",
          skillsTeach: ["Digital Marketing", "Financial Modeling"],
          skillsLearn: ["Data Analysis", "SQL", "Python"],
          bio: "Business student looking to learn data science skills for market analysis.",
          sessionsCompleted: 5,
          rating: 4.7,
          createdAt: Date.now() - 86400000 * 2
        },
        {
          fullName: "aditya",
          email: "aditya@campus.edu",
          course: "MBA Business",
          year: "1st Year",
          skillsTeach: ["Financial Modeling"],
          skillsLearn: ["SQL", "Python"],
          bio: "Business student looking to learn data science skills for market analysis.",
          sessionsCompleted: 5,
          rating: 4.7,
          createdAt: Date.now() - 86400000 * 2
        }
        
      ];

      // setDoc with a stable id prevents duplicate demo records if two devices
      // open the site at the same time.
      await Promise.all(demoUsers.map(async (u) => {
        try {
          await setDoc(doc(getPublicCollection('users'), makeUserDocId(u.email)), u, { merge: true });
        } catch (e) {
          console.error("Error seeding user:", e);
        }
      }));
    }

    window.handleRegistration = async function(event) {
      event.preventDefault();
      clearAuthError();

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim().toLowerCase();
      const password = document.getElementById('reg-password').value;
      const course = document.getElementById('reg-course').value;
      const year = document.getElementById('reg-year').value;
      const teachRaw = document.getElementById('reg-skills-teach').value;
      const learnRaw = document.getElementById('reg-skills-learn').value;
      const bio = document.getElementById('reg-bio').value.trim();

      const teachSkills = teachRaw.split(',').map(s => s.trim()).filter(Boolean);
      const learnSkills = learnRaw.split(',').map(s => s.trim()).filter(Boolean);

      // Fast local duplicate check before making any network request.
      const existing = window.state.users.find(u => u.email?.toLowerCase() === email);
      if (existing) {
        showAuthError("This College ID / Email is already registered. Please use Log In.");
        switchAuthTab('login');
        document.getElementById('login-email').value = email;
        return;
      }

      if (password.length < 6) {
        showAuthError("Password must be at least 6 characters.");
        return;
      }

      const btn = document.getElementById('reg-submit-btn');
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Creating account...`;

      const newStudentData = {
        fullName: name,
        email: email,
        course: course,
        year: year,
        skillsTeach: teachSkills,
        skillsLearn: learnSkills,
        bio: bio || "Enthusiastic student ready to swap skills!",
        sessionsCompleted: 0,
        rating: 5.0,
        createdAt: Date.now()
      };

      try {
        // REAL Firebase Authentication:
        // password is no longer stored in the public Firestore users collection.
        const credential = await createUserWithEmailAndPassword(auth, email, password);

        // Stable email-based document id means every student gets their own record.
        await setDoc(
          doc(getPublicCollection('users'), makeUserDocId(email)),
          newStudentData,
          { merge: true }
        );

        newStudentData.id = makeUserDocId(email);

        // Update the UI immediately; don't wait for the next realtime snapshot.
        window.state.currentUser = newStudentData;
        window.state.users = [
          ...window.state.users.filter(u => u.email?.toLowerCase() !== email),
          newStudentData
        ];
        sessionStorage.setItem('skillswap_user_email', email);

        closeAuthModal();
        showToast(`🎉 Registration successful! Welcome, ${name}.`);
        switchTab('marketplace');
        updateUI();
      } catch (err) {
        console.error("Firebase registration error:", err);

        let message = "Registration failed. Please try again.";
        if (err?.code === 'auth/email-already-in-use') {
          message = "This email is already registered. Please Log In instead.";
          switchAuthTab('login');
          document.getElementById('login-email').value = email;
        } else if (err?.code === 'auth/invalid-email') {
          message = "Please enter a valid college email / Student ID.";
        } else if (err?.code === 'auth/weak-password') {
          message = "Password must be at least 6 characters.";
        } else if (err?.code === 'permission-denied') {
          message = "Firebase Firestore permission denied. Check your Firestore rules.";
        }

        showAuthError(message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Save & Register to Firebase`;
      }
    };

    window.handleLogin = async function(event) {
      event.preventDefault();
      clearAuthError();

      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const password = document.getElementById('login-password').value;

      const btn = document.getElementById('login-submit-btn');
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Logging in...`;

      try {
        // Login is handled by Firebase Auth, so the student does NOT need to register again.
        const credential = await signInWithEmailAndPassword(auth, email, password);

        const profileSnap = await getDoc(
          doc(getPublicCollection('users'), makeUserDocId(email))
        );

        if (!profileSnap.exists()) {
          throw new Error("PROFILE_NOT_FOUND");
        }

        const foundUser = { id: profileSnap.id, ...profileSnap.data() };

        window.state.currentUser = foundUser;
        window.state.users = [
          ...window.state.users.filter(u => u.email?.toLowerCase() !== email),
          foundUser
        ];
        sessionStorage.setItem('skillswap_user_email', email);

        closeAuthModal();
        showToast(`👋 Welcome back, ${foundUser.fullName}!`);
        updateUI();
      } catch (err) {
        console.error("Firebase login error:", err);

        // Compatibility migration for students registered with the old version.
        // Old version stored a password in the Firestore profile. If such a record
        // still exists, convert it to Firebase Authentication on the first login.
        const legacyUser = window.state.users.find(
          u => u.email?.toLowerCase() === email && u.password
        );

        if (
          legacyUser &&
          (legacyUser.password === password) &&
          (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential')
        ) {
          try {
            const legacyCredential = await createUserWithEmailAndPassword(auth, email, password);

            const migratedProfile = {
              fullName: legacyUser.fullName,
              email: legacyUser.email,
              course: legacyUser.course,
              year: legacyUser.year,
              skillsTeach: legacyUser.skillsTeach || [],
              skillsLearn: legacyUser.skillsLearn || [],
              bio: legacyUser.bio || "Enthusiastic student ready to swap skills!",
              sessionsCompleted: legacyUser.sessionsCompleted || 0,
              rating: legacyUser.rating || 5.0,
              createdAt: legacyUser.createdAt || Date.now()
            };

            // Replace the old random-id record with a permanent email-id record.
            await setDoc(
              doc(getPublicCollection('users'), makeUserDocId(email)),
              migratedProfile
            );

            if (legacyUser.id && legacyUser.id !== makeUserDocId(email)) {
              await deleteDoc(doc(getPublicCollection('users'), legacyUser.id));
            }

            window.state.currentUser = {
              id: makeUserDocId(email),
              ...migratedProfile
            };
            window.state.users = [
              ...window.state.users.filter(u => u.email?.toLowerCase() !== email),
              window.state.currentUser
            ];
            sessionStorage.setItem('skillswap_user_email', email);

            closeAuthModal();
            showToast(`👋 Welcome back, ${legacyUser.fullName}! Your old account was upgraded.`);
            updateUI();
            return;
          } catch (migrationErr) {
            console.error("Legacy account migration failed:", migrationErr);
            // If Auth account was created but profile migration failed, the next
            // login can still use Firebase Auth; show the normal error below.
          }
        }

        let message = "Login failed. Check your email and password.";
        if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
          message = "Account not found. Register once first, then use Login next time.";
        } else if (err?.code === 'auth/wrong-password') {
          message = "Incorrect password. Please try again.";
        } else if (err?.message === "PROFILE_NOT_FOUND") {
          message = "Your login exists, but your student profile is missing in Firestore.";
        } else if (err?.code === 'permission-denied') {
          message = "Firebase Firestore permission denied. Check your Firestore rules.";
        }

        showAuthError(message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Verify & Log In`;
      }
    };

    window.logoutUser = async function() {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("Firebase sign-out warning:", err);
      }
      window.state.currentUser = null;
      sessionStorage.removeItem('skillswap_user_email');
      showToast("Logged out successfully.");
      updateUI();
    };

    function showAuthError(msg) {
      const box = document.getElementById('auth-error-box');
      const text = document.getElementById('auth-error-msg');
      text.textContent = msg;
      box.classList.remove('hidden');
    }

    function clearAuthError() {
      const box = document.getElementById('auth-error-box');
      box.classList.add('hidden');
    }

    window.switchTab = function(tabName) {
      window.state.activeTab = tabName;

      // Hide all views
      const views = ['dashboard', 'marketplace', 'matches', 'messages', 'video', 'admin'];
      views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
        const navBtn = document.getElementById(`nav-${v}`);
        if (navBtn) {
          navBtn.classList.remove('text-blue-600', 'bg-blue-50', 'font-semibold');
          navBtn.classList.add('text-slate-600', 'font-medium');
        }
      });

      // Show targeted view
      const targetView = document.getElementById(`view-${tabName}`);
      if (targetView) targetView.classList.remove('hidden');

      const targetNav = document.getElementById(`nav-${tabName}`);
      if (targetNav) {
        targetNav.classList.add('text-blue-600', 'bg-blue-50', 'font-semibold');
        targetNav.classList.remove('text-slate-600', 'font-medium');
      }

      updateUI();
    };

    function updateUI() {
      renderUserHeader();
      renderDashboard();
      renderMarketplace();
      renderMatches();
      renderMessages();
      renderAdminDirectory();
    }

    function renderUserHeader() {
      const headerArea = document.getElementById('user-header-area');
      const heroRegisterBtn = document.getElementById('hero-register-btn');
      const curr = window.state.currentUser;

      if (curr) {
        if (heroRegisterBtn) heroRegisterBtn.classList.add('hidden');
        headerArea.innerHTML = `
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-full bg-blue-100 border border-blue-300 text-blue-700 font-bold flex items-center justify-center text-sm shadow-sm">
              ${curr.fullName.substring(0,2).toUpperCase()}
            </div>
            <div class="hidden sm:block text-left">
              <div class="text-xs font-bold text-slate-800 leading-tight">${curr.fullName}</div>
              <div class="text-[10px] text-slate-500">${curr.course}</div>
            </div>
            <button onclick="logoutUser()" class="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition" title="Log Out">
              <i class="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        `;
      } else {
        if (heroRegisterBtn) heroRegisterBtn.classList.remove('hidden');
        headerArea.innerHTML = `
          <button onclick="openAuthModal('login')" class="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3 py-2">
            Log In
          </button>
          <button onclick="openAuthModal('register')" class="text-sm font-semibold text-white gradient-bg px-4 py-2 rounded-lg shadow hover:opacity-95 transition">
            Register Student
          </button>
        `;
      }
    }

    function renderDashboard() {
      const users = window.state.users || [];
      const matches = window.state.matches || [];
      const sessions = window.state.sessions || [];

      // 1. Live Dynamic Stats
      document.getElementById('stat-active-students').textContent = users.length;
      document.getElementById('stat-skill-matches').textContent = matches.length;
      document.getElementById('stat-sessions-completed').textContent = sessions.length;

      // Extract unique skills across campus
      const allSkills = new Set();
      users.forEach(u => {
        (u.skillsTeach || []).forEach(s => allSkills.add(s.trim().toLowerCase()));
        (u.skillsLearn || []).forEach(s => allSkills.add(s.trim().toLowerCase()));
      });
      document.getElementById('stat-unique-skills').textContent = allSkills.size;

      // 2. Skills Cloud
      const skillsCloudEl = document.getElementById('skills-cloud');
      if (skillsCloudEl) {
        const topSkills = ["Python", "Figma", "UI/UX", "Data Structures", "Digital Marketing", "React", "Financial Modeling", "Public Speaking", "SQL", "Calculus"];
        skillsCloudEl.innerHTML = topSkills.map(sk => `
          <button onclick="searchBySkillTag('${sk}')" class="px-3 py-1.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition flex items-center gap-1.5">
            <i class="fa-solid fa-tag text-[10px] text-blue-500"></i> ${sk}
          </button>
        `).join('');
      }

      // 3. Featured Peer Cards
      const featuredGrid = document.getElementById('featured-students-grid');
      if (featuredGrid) {
        const sampleList = users.slice(0, 4);
        if (sampleList.length === 0) {
          featuredGrid.innerHTML = `<p class="text-xs text-slate-400 italic col-span-2">No student profiles registered yet.</p>`;
        } else {
          featuredGrid.innerHTML = sampleList.map(u => `
            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl gradient-bg text-white font-bold flex items-center justify-center text-sm shadow">
                  ${u.fullName.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h5 class="text-xs font-bold text-slate-900">${u.fullName}</h5>
                  <p class="text-[11px] text-slate-500">${u.course}</p>
                  <div class="flex items-center gap-1 mt-1">
                    <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Teaches: ${u.skillsTeach?.[0] || 'Skill'}</span>
                  </div>
                </div>
              </div>
              <button onclick="openProfileModal('${u.id}')" class="text-xs text-blue-600 font-bold hover:underline">
                View &rarr;
              </button>
            </div>
          `).join('');
        }
      }

      // 4. Live Activity Stream
      const activityFeed = document.getElementById('live-activity-stream');
      if (activityFeed) {
        if (users.length === 0) {
          activityFeed.innerHTML = `<p class="text-xs text-slate-400 italic">Awaiting campus network activity...</p>`;
        } else {
          // Render dynamic logs based on real database records
          activityFeed.innerHTML = users.slice().reverse().map(u => `
            <div class="flex items-start space-x-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                ${u.fullName.substring(0,2).toUpperCase()}
              </div>
              <div>
                <p class="text-slate-800"><span class="font-bold">${u.fullName}</span> registered on SkillSwap Campus.</p>
                <div class="text-[10px] text-slate-400 mt-0.5">Teaches: ${u.skillsTeach?.join(', ')}</div>
              </div>
            </div>
          `).join('');
        }
      }
    }

    window.renderMarketplace = function() {
      const grid = document.getElementById('marketplace-grid');
      if (!grid) return;

      const searchInput = document.getElementById('marketplace-search-input')?.value.toLowerCase().trim() || '';
      let users = window.state.users || [];

      // Filter logic
      if (searchInput) {
        users = users.filter(u => 
          u.fullName.toLowerCase().includes(searchInput) ||
          u.course.toLowerCase().includes(searchInput) ||
          (u.skillsTeach && u.skillsTeach.some(s => s.toLowerCase().includes(searchInput))) ||
          (u.skillsLearn && u.skillsLearn.some(s => s.toLowerCase().includes(searchInput)))
        );
      }

      if (window.state.filterCategory !== 'ALL') {
        const cat = window.state.filterCategory.toLowerCase();
        users = users.filter(u => {
          const teachStr = (u.skillsTeach || []).join(' ').toLowerCase();
          const learnStr = (u.skillsLearn || []).join(' ').toLowerCase();
          if (cat === 'coding') return teachStr.includes('python') || teachStr.includes('react') || teachStr.includes('data') || teachStr.includes('html') || learnStr.includes('python');
          if (cat === 'design') return teachStr.includes('figma') || teachStr.includes('design') || teachStr.includes('ui') || learnStr.includes('figma');
          if (cat === 'business') return teachStr.includes('marketing') || teachStr.includes('finance') || teachStr.includes('business');
          if (cat === 'math') return teachStr.includes('math') || teachStr.includes('calculus') || teachStr.includes('science');
          return true;
        });
      }

      if (users.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
            <i class="fa-solid fa-users-slash text-4xl mb-3 text-slate-300"></i>
            <h4 class="text-base font-bold text-slate-700">No Swap Partners Found</h4>
            <p class="text-xs text-slate-500">Try adjusting your search terms or register a new account!</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = users.map(u => {
        const isSelf = window.state.currentUser && window.state.currentUser.email === u.email;

        return `
          <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between relative">
            ${isSelf ? `<span class="absolute top-4 right-4 bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">YOU</span>` : ''}
            
            <div>
              <!-- Header Profile Info -->
              <div class="flex items-center space-x-3 mb-4">
                <div class="w-12 h-12 rounded-2xl gradient-bg text-white font-extrabold flex items-center justify-center text-base shadow-md">
                  ${u.fullName.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h4 class="text-base font-bold text-slate-900">${u.fullName}</h4>
                  <p class="text-xs text-slate-500 font-medium">${u.course} • ${u.year}</p>
                  <div class="flex items-center space-x-1 text-amber-500 text-xs mt-0.5">
                    <i class="fa-solid fa-star"></i>
                    <span class="font-bold text-slate-700">${u.rating || 5.0}</span>
                    <span class="text-slate-400 text-[10px]">(${u.sessionsCompleted || 0} swaps)</span>
                  </div>
                </div>
              </div>

              <!-- Bio -->
              <p class="text-xs text-slate-600 mb-4 line-clamp-2 italic">
                "${u.bio || 'Ready to exchange skills on campus.'}"
              </p>

              <!-- Skills Offered -->
              <div class="space-y-2 mb-4">
                <div>
                  <span class="text-[10px] font-bold uppercase text-emerald-700 tracking-wider block mb-1">
                    <i class="fa-solid fa-chalkboard-user mr-1"></i> Can Teach:
                  </span>
                  <div class="flex flex-wrap gap-1">
                    ${(u.skillsTeach || []).map(s => `
                      <span class="bg-emerald-50 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-md border border-emerald-200">${s}</span>
                    `).join('')}
                  </div>
                </div>

                <div>
                  <span class="text-[10px] font-bold uppercase text-blue-700 tracking-wider block mb-1">
                    <i class="fa-solid fa-book-open mr-1"></i> Wants to Learn:
                  </span>
                  <div class="flex flex-wrap gap-1">
                    ${(u.skillsLearn || []).map(s => `
                      <span class="bg-blue-50 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-md border border-blue-200">${s}</span>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button onclick="requestSkillSwap('${u.id}')" class="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                <i class="fa-solid fa-handshake"></i> Request Swap
              </button>
              <button onclick="openDirectMessage('${u.id}')" class="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1">
                <i class="fa-solid fa-comment"></i> Chat
              </button>
            </div>
          </div>
        `;
      }).join('');
    };

    window.filterMarketplace = function() {
      renderMarketplace();
    };

    window.setFilterCategory = function(cat) {
      window.state.filterCategory = cat;
      const btns = document.querySelectorAll('.category-btn');
      btns.forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white');
        b.classList.add('bg-slate-100', 'text-slate-600');
      });
      event.target.classList.add('bg-blue-600', 'text-white');
      event.target.classList.remove('bg-slate-100', 'text-slate-600');
      renderMarketplace();
    };

    window.searchBySkillTag = function(skillTag) {
      switchTab('marketplace');
      const input = document.getElementById('marketplace-search-input');
      if (input) {
        input.value = skillTag;
        renderMarketplace();
      }
    };

    window.requestSkillSwap = async function(targetUserId) {
      if (!window.state.currentUser) {
        openAuthModal('login');
        showAuthError("Please log in or register to connect and swap skills!");
        return;
      }

      const targetUser = window.state.users.find(u => u.id === targetUserId);
      if (!targetUser) return;

      if (targetUser.email === window.state.currentUser.email) {
        showToast("You cannot request a skill swap with yourself!");
        return;
      }

      const matchData = {
        requesterEmail: window.state.currentUser.email,
        requesterName: window.state.currentUser.fullName,
        receiverEmail: targetUser.email,
        receiverName: targetUser.fullName,
        status: 'ACCEPTED', // Instant active connection for smooth UX
        createdAt: Date.now()
      };

      try {
        await addDoc(getPublicCollection('matches'), matchData);
        showToast(`🤝 Swap Connected with ${targetUser.fullName}! Match saved to Firebase.`);
        switchTab('matches');
      } catch (err) {
        console.error("Error creating match:", err);
        showToast("Failed to create match on Firebase.");
      }
    };

    function renderMatches() {
      const container = document.getElementById('matches-container');
      if (!container) return;

      const curr = window.state.currentUser;
      if (!curr) {
        container.innerHTML = `
          <div class="col-span-full bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
            <i class="fa-solid fa-lock text-4xl text-slate-300 mb-3"></i>
            <h4 class="text-base font-bold text-slate-800">Login Required</h4>
            <p class="text-xs text-slate-500 mb-4">Log in to view your ongoing skill swaps and connected campus peers.</p>
            <button onclick="openAuthModal('login')" class="px-4 py-2 gradient-bg text-white font-bold text-xs rounded-xl shadow">Log In Now</button>
          </div>
        `;
        return;
      }

      const userMatches = window.state.matches.filter(m => 
        m.requesterEmail === curr.email || m.receiverEmail === curr.email
      );

      if (userMatches.length === 0) {
        container.innerHTML = `
          <div class="col-span-full bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
            <i class="fa-solid fa-handshake-slash text-4xl text-slate-300 mb-3"></i>
            <h4 class="text-base font-bold text-slate-700">No Matches Yet</h4>
            <p class="text-xs text-slate-500 mb-4">Browse the Marketplace to request a skill swap with fellow students!</p>
            <button onclick="switchTab('marketplace')" class="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow">Find Swap Partners</button>
          </div>
        `;
        return;
      }

      container.innerHTML = userMatches.map(m => {
        const partnerEmail = m.requesterEmail === curr.email ? m.receiverEmail : m.requesterEmail;
        const partner = window.state.users.find(u => u.email === partnerEmail) || {
          fullName: m.requesterEmail === curr.email ? m.receiverName : m.requesterName,
          course: "Campus Student",
          skillsTeach: ["Knowledge Exchange"]
        };

        return `
          <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 rounded-2xl gradient-bg text-white font-extrabold flex items-center justify-center text-base shadow">
                ${partner.fullName.substring(0,2).toUpperCase()}
              </div>
              <div>
                <span class="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Connected Match
                </span>
                <h4 class="text-base font-bold text-slate-900 mt-1">${partner.fullName}</h4>
                <p class="text-xs text-slate-500">${partner.course || 'Student'}</p>
              </div>
            </div>

            <div class="flex flex-col space-y-2">
              <button onclick="openDirectMessageByEmail('${partnerEmail}')" class="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1">
                <i class="fa-solid fa-comments"></i> Chat
              </button>
              <button onclick="switchTab('video')" class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center justify-center gap-1 border border-emerald-200">
                <i class="fa-solid fa-video"></i> Video Call
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderMessages() {
      const userListEl = document.getElementById('messages-user-list');
      if (!userListEl) return;

      const users = window.state.users || [];
      const curr = window.state.currentUser;

      if (users.length === 0) {
        userListEl.innerHTML = `<div class="p-4 text-xs text-slate-400">No peers available for messaging.</div>`;
        return;
      }

      userListEl.innerHTML = users.map(u => {
        const isSelf = curr && curr.email === u.email;
        const isActive = window.state.activeChatUser && window.state.activeChatUser.id === u.id;

        return `
          <div onclick="selectChatUser('${u.id}')" class="p-3 hover:bg-slate-100 cursor-pointer transition flex items-center space-x-3 ${isActive ? 'bg-blue-50 border-l-4 border-blue-600' : ''}">
            <div class="w-9 h-9 rounded-xl gradient-bg text-white font-bold flex items-center justify-center text-xs shadow-sm">
              ${u.fullName.substring(0,2).toUpperCase()}
            </div>
            <div class="flex-grow overflow-hidden">
              <div class="flex justify-between items-center">
                <h5 class="text-xs font-bold text-slate-900 truncate">${u.fullName} ${isSelf ? '(You)' : ''}</h5>
              </div>
              <p class="text-[10px] text-slate-500 truncate">${u.course}</p>
            </div>
          </div>
        `;
      }).join('');

      renderChatConversation();
    }

    window.selectChatUser = function(userId) {
      const u = window.state.users.find(x => x.id === userId);
      if (u) {
        window.state.activeChatUser = u;
        renderMessages();
      }
    };

    window.openDirectMessage = function(userId) {
      selectChatUser(userId);
      switchTab('messages');
    };

    window.openDirectMessageByEmail = function(email) {
      const u = window.state.users.find(x => x.email === email);
      if (u) {
        selectChatUser(u.id);
        switchTab('messages');
      }
    };

    function renderChatConversation() {
      const headerInfo = document.getElementById('chat-header-info');
      const headerActions = document.getElementById('chat-header-actions');
      const chatHistory = document.getElementById('chat-history');
      const chatInput = document.getElementById('chat-input-text');
      const chatSendBtn = document.getElementById('chat-send-btn');

      const target = window.state.activeChatUser;
      const curr = window.state.currentUser;

      if (!target) {
        headerInfo.innerHTML = `<span class="text-xs font-semibold text-slate-500">Select a peer on the left to start chatting</span>`;
        headerActions.classList.add('hidden');
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
        return;
      }

      headerInfo.innerHTML = `
        <div class="w-9 h-9 rounded-xl gradient-bg text-white font-bold flex items-center justify-center text-xs">
          ${target.fullName.substring(0,2).toUpperCase()}
        </div>
        <div>
          <h4 class="text-xs font-bold text-slate-900">${target.fullName}</h4>
          <span class="text-[10px] text-emerald-600 font-medium">Online for Skill Swap</span>
        </div>
      `;
      headerActions.classList.remove('hidden');

      if (!curr) {
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
        chatHistory.innerHTML = `
          <div class="text-center p-8 text-xs text-slate-500">
            Please <a href="#" onclick="openAuthModal('login')" class="text-blue-600 font-bold underline">log in</a> to send real-time messages.
          </div>
        `;
        return;
      }

      chatInput.disabled = false;
      chatSendBtn.disabled = false;

      // Filter messages between current user and target
      const conversation = (window.state.messages || []).filter(m => 
        (m.senderEmail === curr.email && m.receiverEmail === target.email) ||
        (m.senderEmail === target.email && m.receiverEmail === curr.email)
      ).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      if (conversation.length === 0) {
        chatHistory.innerHTML = `
          <div class="text-center p-8 text-slate-400 text-xs">
            <p>This is the start of your peer chat with <span class="font-bold text-slate-600">${target.fullName}</span>.</p>
            <p class="mt-1">Say hello or schedule your virtual study session!</p>
          </div>
        `;
      } else {
        chatHistory.innerHTML = conversation.map(m => {
          const isMe = m.senderEmail === curr.email;
          return `
            <div class="flex ${isMe ? 'justify-end' : 'justify-start'} mb-2">
              <div class="${isMe ? 'bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl' : 'bg-white text-slate-800 border border-slate-200 rounded-r-2xl rounded-tl-2xl'} p-3 text-xs max-w-xs sm:max-w-md shadow-sm">
                <p>${m.text}</p>
                <span class="text-[9px] ${isMe ? 'text-blue-200' : 'text-slate-400'} block mt-1 text-right">
                  ${m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                </span>
              </div>
            </div>
          `;
        }).join('');

        // Auto scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
      }
    }

    window.sendChatMessage = async function(e) {
      e.preventDefault();
      const input = document.getElementById('chat-input-text');
      const text = input.value.trim();
      const curr = window.state.currentUser;
      const target = window.state.activeChatUser;

      if (!text || !curr || !target) return;

      const msgObj = {
        senderEmail: curr.email,
        receiverEmail: target.email,
        text: text,
        createdAt: Date.now()
      };

      input.value = '';

      try {
        await addDoc(getPublicCollection('messages'), msgObj);
      } catch (err) {
        console.error("Error sending message to Firebase:", err);
      }
    };

    window.toggleVideoCallSession = async function() {
      const callBtn = document.getElementById('call-toggle-btn');
      const remoteVideo = document.getElementById('remote-video-element');
      const localVideoBox = document.getElementById('local-video-box');
      const localVideo = document.getElementById('local-video-element');
      const placeholder = document.getElementById('video-placeholder');
      const statusBadge = document.getElementById('call-status-badge');

      const ctrlBtns = ['btn-mic-toggle', 'btn-cam-toggle', 'btn-screen-share', 'btn-end-call'];

      if (!window.state.callActive) {
        // Start Call
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          window.state.callStream = stream;
          localVideo.srcObject = stream;
          
          localVideoBox.classList.remove('hidden');
          placeholder.classList.add('hidden');
          statusBadge.classList.remove('hidden');
          
          window.state.callActive = true;
          callBtn.innerHTML = `<i class="fa-solid fa-phone-slash"></i> Leave Study Call`;
          callBtn.classList.replace('bg-emerald-600', 'bg-red-600');
          callBtn.classList.replace('hover:bg-emerald-700', 'hover:bg-red-700');

          ctrlBtns.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
          });

          showToast("📹 Peer Video Study Call Started!");

          // Record session to Firebase stats
          if (window.state.currentUser) {
            addDoc(getPublicCollection('sessions'), {
              studentEmail: window.state.currentUser.email,
              timestamp: Date.now()
            });
          }

        } catch (err) {
          console.warn("Camera/Mic access unavailable or denied:", err);
          showToast("Camera access unavailable. Video study room running in demo mode.");
          
          placeholder.innerHTML = `
            <div class="text-center p-8 text-emerald-400">
              <i class="fa-solid fa-video text-5xl mb-3 animate-pulse"></i>
              <h3 class="text-lg font-bold text-white">Study Room Streaming</h3>
              <p class="text-xs text-slate-300">Connected with campus peer study group.</p>
            </div>
          `;
          statusBadge.classList.remove('hidden');
          window.state.callActive = true;
          callBtn.innerHTML = `<i class="fa-solid fa-phone-slash"></i> Leave Study Call`;
        }
      } else {
        // End Call
        if (window.state.callStream) {
          window.state.callStream.getTracks().forEach(t => t.stop());
          window.state.callStream = null;
        }

        localVideoBox.classList.add('hidden');
        placeholder.classList.remove('hidden');
        statusBadge.classList.add('hidden');

        placeholder.innerHTML = `
          <div class="w-20 h-20 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-3xl mb-4 text-blue-400">
            <i class="fa-solid fa-video-slash"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-1">Study Room Offline</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">Click "Start Live Study Call" above to launch your video & microphone stream for instant skill sessions.</p>
        `;

        window.state.callActive = false;
        callBtn.innerHTML = `<i class="fa-solid fa-video"></i> Start Live Study Call`;
        callBtn.classList.replace('bg-red-600', 'bg-emerald-600');
        callBtn.classList.replace('hover:bg-red-700', 'hover:bg-emerald-700');

        ctrlBtns.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.disabled = true;
        });

        showToast("Call ended.");
      }
    };

    window.toggleMic = function() {
      if (!window.state.callStream) return;
      const audioTrack = window.state.callStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        window.state.isMicMuted = !audioTrack.enabled;
        const btn = document.getElementById('btn-mic-toggle');
        btn.innerHTML = window.state.isMicMuted ? `<i class="fa-solid fa-microphone-slash text-red-400"></i>` : `<i class="fa-solid fa-microphone"></i>`;
        showToast(window.state.isMicMuted ? "Microphone Muted" : "Microphone Active");
      }
    };

    window.toggleCam = function() {
      if (!window.state.callStream) return;
      const videoTrack = window.state.callStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        window.state.isCamOff = !videoTrack.enabled;
        const btn = document.getElementById('btn-cam-toggle');
        btn.innerHTML = window.state.isCamOff ? `<i class="fa-solid fa-video-slash text-red-400"></i>` : `<i class="fa-solid fa-video"></i>`;
        showToast(window.state.isCamOff ? "Camera Off" : "Camera On");
      }
    };

    window.toggleScreenShare = function() {
      showToast("🖥️ Screen sharing simulation active!");
    };

    window.startInstantVideoCall = function() {
      switchTab('video');
      toggleVideoCallSession();
    };

    window.copyStudyNotes = function() {
      const area = document.getElementById('study-notes-area');
      if (area) {
        area.select();
        document.execCommand('copy');
        showToast("📋 Study notes copied to clipboard!");
      }
    };

    window.renderAdminDirectory = function() {
      const tbody = document.getElementById('admin-users-table-body');
      if (!tbody) return;

      const searchInput = document.getElementById('admin-search-input')?.value.toLowerCase().trim() || '';
      let users = window.state.users || [];

      if (searchInput) {
        users = users.filter(u => 
          u.fullName.toLowerCase().includes(searchInput) || 
          u.email.toLowerCase().includes(searchInput) ||
          u.course.toLowerCase().includes(searchInput)
        );
      }

      if (users.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="px-6 py-8 text-center text-slate-400 italic">
              No registered students in Firebase database matching criteria.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-50 transition">
          <td class="px-6 py-4 flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl gradient-bg text-white font-bold flex items-center justify-center text-xs">
              ${u.fullName.substring(0,2).toUpperCase()}
            </div>
            <div>
              <div class="font-bold text-slate-900">${u.fullName}</div>
              <div class="text-[10px] text-slate-400">Registered: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}</div>
            </div>
          </td>
          <td class="px-6 py-4 text-xs font-mono text-slate-600">${u.email}</td>
          <td class="px-6 py-4 text-xs">${u.course} (${u.year || 'Student'})</td>
          <td class="px-6 py-4">
            <div class="flex flex-wrap gap-1">
              ${(u.skillsTeach || []).map(s => `<span class="bg-emerald-50 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-200">${s}</span>`).join('')}
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="flex flex-wrap gap-1">
              ${(u.skillsLearn || []).map(s => `<span class="bg-blue-50 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-200">${s}</span>`).join('')}
            </div>
          </td>
          <td class="px-6 py-4 text-center font-bold text-slate-800">${u.sessionsCompleted || 0}</td>
          <td class="px-6 py-4 text-right">
            <button onclick="openProfileModal('${u.id}')" class="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline">
              View Profile
            </button>
          </td>
        </tr>
      `).join('');
    };

    window.openProfileModal = function(userId) {
      const u = window.state.users.find(x => x.id === userId);
      if (!u) return;

      const content = document.getElementById('profile-modal-content');
      content.innerHTML = `
        <div class="text-center mb-4">
          <div class="w-16 h-16 rounded-3xl gradient-bg text-white font-extrabold flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg">
            ${u.fullName.substring(0,2).toUpperCase()}
          </div>
          <h3 class="text-xl font-extrabold text-slate-900">${u.fullName}</h3>
          <p class="text-xs text-slate-500 font-medium">${u.course} • ${u.year}</p>
          <div class="text-xs text-slate-400 font-mono mt-1"><i class="fa-solid fa-envelope mr-1"></i> ${u.email}</div>
        </div>

        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 mb-6 text-xs">
          <div>
            <span class="font-bold text-slate-700 block mb-1">About Student:</span>
            <p class="text-slate-600 italic">"${u.bio || 'No bio provided.'}"</p>
          </div>

          <div>
            <span class="font-bold text-emerald-800 block mb-1">Skills Offering (Can Teach):</span>
            <div class="flex flex-wrap gap-1">
              ${(u.skillsTeach || []).map(s => `<span class="bg-emerald-100 text-emerald-900 font-semibold px-2 py-0.5 rounded">${s}</span>`).join('')}
            </div>
          </div>

          <div>
            <span class="font-bold text-blue-800 block mb-1">Skills Seeking (Wants to Learn):</span>
            <div class="flex flex-wrap gap-1">
              ${(u.skillsLearn || []).map(s => `<span class="bg-blue-100 text-blue-900 font-semibold px-2 py-0.5 rounded">${s}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button onclick="requestSkillSwap('${u.id}'); closeProfileModal();" class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow">
            Request Skill Swap
          </button>
          <button onclick="openDirectMessage('${u.id}'); closeProfileModal();" class="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
            Chat
          </button>
        </div>
      `;

      document.getElementById('profile-detail-modal').classList.remove('hidden');
    };

    window.closeProfileModal = function() {
      document.getElementById('profile-detail-modal').classList.add('hidden');
    };

    window.openAuthModal = function(tab = 'register') {
      clearAuthError();
      document.getElementById('auth-modal').classList.remove('hidden');
      switchAuthTab(tab);
    };

    window.closeAuthModal = function() {
      document.getElementById('auth-modal').classList.add('hidden');
    };

    window.switchAuthTab = function(tab) {
      const regTab = document.getElementById('auth-tab-register');
      const loginTab = document.getElementById('auth-tab-login');
      const regForm = document.getElementById('form-register');
      const loginForm = document.getElementById('form-login');

      clearAuthError();

      if (tab === 'register') {
        regTab.classList.add('border-blue-600', 'text-blue-600');
        regTab.classList.remove('border-transparent', 'text-slate-400');
        loginTab.classList.remove('border-blue-600', 'text-blue-600');
        loginTab.classList.add('border-transparent', 'text-slate-400');
        regForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
      } else {
        loginTab.classList.add('border-blue-600', 'text-blue-600');
        loginTab.classList.remove('border-transparent', 'text-slate-400');
        regTab.classList.remove('border-blue-600', 'text-blue-600');
        regTab.classList.add('border-transparent', 'text-slate-400');
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
      }
    };

    function showToast(msg) {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-bounce pointer-events-auto';
      toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i> <span>${msg}</span>`;

      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
      }, 3500);
    }

    // Initialize Application on Window Load
    window.addEventListener('error', (event) => {
      console.error('SkillSwap JavaScript error:', event.error || event.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('SkillSwap Promise error:', event.reason);
    });

    window.onload = function() {
      try {
        initFirebaseAndApp();
      } catch (err) {
        console.error('Firebase initialization failed:', err);
        showAuthError('Firebase could not initialize. Check the Firebase project configuration.');
      }
    };
  
