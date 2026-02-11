// Global Variables

let courses = coursesDB;
let currentCourse = null;
let player; // كائن مشغل يوتيوب العالمي

// Storage & Progress
function getProgress() {
  return JSON.parse(localStorage.getItem("progress")) || {};
}

function saveProgress(progress) {
  localStorage.setItem("progress", JSON.stringify(progress));
}

// Navigation
function changePage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.add("hidden");
    page.classList.remove("block");
  });

  const activePage = document.getElementById(pageId);
  if (!activePage) return;

  activePage.classList.remove("hidden");
  activePage.classList.add("block");

  if (pageId === "courses") drawCoursesUI(courses);
  if (pageId !== "courseDetails") changeLinkColor(activePage);
}

changePage("home");

function changeLinkColor(activePage) {
  const links = document.querySelectorAll(".links");
  links.forEach((link) => link.classList.remove("text-blue-600"));
  const activeLink = document.getElementById(activePage.id + "Link");
  if (activeLink) activeLink.classList.add("text-blue-600");
}

// UI Drawing
function drawCoursesUI(coursesList) {
  const coursesContainer = document.getElementById("courses-container");
  const numOfCourses = document.getElementById("num-of-courses");
  if (!coursesContainer) return;

  if (numOfCourses) numOfCourses.innerHTML = coursesList.length || "0";

  coursesContainer.innerHTML = coursesList
    .map(
      (course) => `
      <div class="cursor-pointer border border-gray-200 rounded-xl shadow-sm hover:shadow-md bg-white p-7 transition-all">
        <span class="text-indigo-700 bg-indigo-100 py-0.5 px-3 text-sm rounded-full">تكنولوجيا المعلومات</span>
        <h3 class="text-gray-900 text-xl mt-4 mb-2">${course.title}</h3>
        <div class="text-gray-600 text-sm">
          <p>${course.level}</p>
          <p>${course.semester}</p>
        </div>
        <button data-id="${course.id}" class="show-course block mt-6 w-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:opacity-90 transition cursor-pointer">
          عرض الكورس
        </button>
      </div>
  `,
    )
    .join("");
}

function drawLecturesList(lectures) {
  const lecturesContainer = document.getElementById("lectures-container");
  if (!lecturesContainer || !currentCourse) return;

  const progress = getProgress();
  const completedLectures = progress[currentCourse.id] || [];

  lecturesContainer.innerHTML = lectures
    .map((lecture, index) => {
      const isCompleted = completedLectures.includes(lecture.id);
      return `
        <div class="cursor-pointer group lecture-item flex items-center gap-4 p-4 rounded-xl border-2 transition-all mb-3 ${isCompleted ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${isCompleted ? "bg-blue-600" : "bg-gray-300"}">${index + 1}</div>
          <div class="flex-1 font-medium text-gray-800">${lecture.title}</div>

          <button onclick="playVideo('${lecture.videoURL}')" class="cursor-pointer w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition opacity-0 group-hover:opacity-100">
            <i class="fa-solid fa-play fa-xs"></i>
          </button>

          <button class="cursor-pointer check-lecture w-7 h-7 rounded-full border-2 flex items-center justify-center transition ${isCompleted ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"}" data-lecture-id="${lecture.id}">
            <i class="fa-solid fa-check fa-xs"></i>
          </button>
        </div>
      `;
    })
    .join("");
}

// YouTube API Logic

function onYouTubeIframeAPIReady() {
  console.log("YouTube API is ready and loaded.");
}

function extractVideoID(url) {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match && match[1] ? match[1] : null;
}

function playVideo(url) {
  // التأكد من تحميل المكتبة
  if (typeof YT === "undefined" || typeof YT.Player === "undefined") {
    alert("يتم تحميل مشغل الفيديو، يرجى المحاولة مرة أخرى خلال ثوانٍ...");
    return;
  }

  const videoId = extractVideoID(url);
  if (!videoId) return alert("رابط الفيديو غير صالح");

  let playerWrapper = document.getElementById("video-api-wrapper");
  if (!playerWrapper) {
    playerWrapper = document.createElement("div");
    playerWrapper.id = "video-api-wrapper";
    playerWrapper.className =
      "mb-8 rounded-2xl overflow-hidden shadow-xl bg-black aspect-video";
    document.getElementById("lectures-container").prepend(playerWrapper);
  }

  // تنظيف المشغل القديم إذا كان موجوداً لتجنب استهلاك الذاكرة
  if (player && typeof player.destroy === "function") {
    player.destroy();
  }

  playerWrapper.innerHTML = `<div id="youtube-player-element"></div>`;
  playerWrapper.scrollIntoView({ behavior: "smooth", block: "center" });

  player = new YT.Player("youtube-player-element", {
    height: "100%",
    width: "100%",
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      rel: 0,
      modestbranding: 1,
    },
    events: {
      onReady: (event) => {
        // التأكد من بدء التشغيل في بعض المتصفحات التي تحظر الـ Autoplay
        event.target.playVideo();
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.ENDED) {
          console.log("انتهت المحاضرة");
        }
      },
    },
  });
}

// Event Listeners

// فتح الكورس
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".show-course");
  if (!btn) return;
  const courseId = btn.dataset.id;
  currentCourse = courses.find((c) => c.id === courseId);
  if (currentCourse) {
    changePage("courseDetails");
    openCourseDetails(currentCourse);
    drawLecturesList(currentCourse.lectures);
    updateProgressLine(courseId);
  }
});

// تعيين كمكتمل
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".check-lecture");
  if (!btn || !currentCourse) return;

  const lectureId = btn.dataset.lectureId;
  const courseId = currentCourse.id;
  const progress = getProgress();
  progress[courseId] = progress[courseId] || [];

  if (!progress[courseId].includes(lectureId)) {
    progress[courseId].push(lectureId);
  } else {
    progress[courseId] = progress[courseId].filter((id) => id !== lectureId);
  }

  saveProgress(progress);
  drawLecturesList(currentCourse.lectures); // إعادة رسم القائمة لتحديث الألوان
  updateProgressLine(courseId);
});

// التحديث البصري للإنجاز
function updateProgressLine(courseId) {
  const progressLine = document.getElementById("progress-line");
  const progressCounter = document.getElementById("progress-counter");
  const progressPercentage = document.getElementById("progress-percentage");

  if (!progressLine || !currentCourse) return;

  const total = currentCourse.lectures.length;
  const completed = (getProgress()[courseId] || []).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressCounter.textContent = `${completed} / ${total} درس`;
  progressPercentage.textContent = `${percent}% مكتمل`;
  progressLine.style.width = `${percent}%`;
}
// 1. تحديث العنوان والوصف ديناميكياً من بيانات الكورس
function openCourseDetails(course) {
  currentCourse = course;

  // 1. تحديث العنوان والوصف ديناميكياً من بيانات الكورس
  const titleElem = document.getElementById("dynamic-course-title");
  const descElem = document.getElementById("dynamic-course-desc");
  const levelElem = document.getElementById("dynamic-course-level");
  const semesterElem = document.getElementById("dynamic-course-semester");
  const facultyElem = document.getElementById("dynamic-course-faculty");

  if (titleElem) titleElem.innerText = course.title;
  if (descElem) descElem.innerText = course.description;
  if (levelElem) levelElem.innerText = course.level;
  if (semesterElem) semesterElem.innerText = course.semester;
  if (facultyElem) facultyElem.innerText = course.faculty;
}
