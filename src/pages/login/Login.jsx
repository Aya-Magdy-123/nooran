import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../firebase";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { login, forgotPassword } from "../../services/authService";
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [message, setMessage] = useState("");

  // const handleLogin = async (e) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError("");

  //   try {
  //     const userCredential = await signInWithEmailAndPassword(auth, email, password);
  //     const user = userCredential.user;

  //     // جيب الـ token
  //     const token = await user.getIdToken();

  //     // جيب بيانات المستخدم من الباك عشان تعرف الـ role
  //     const res = await fetch(`http://localhost:5000/api/auth/me`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     const data = await res.json();

  //     // خزّن في localStorage
  //     localStorage.setItem("token", token);
  //     localStorage.setItem("role", data.role);
  //     localStorage.setItem("uid", user.uid);
  //     localStorage.setItem("name", data.name);

  //     // وجّه على حسب الـ role
  //     if (data.role === "admin") {
  //       navigate("/admin");
  //     } else if (data.role === "supervisor") {
  //       navigate("/supervisor");
  //     }
  //   } catch (err) {
  //   console.log(err.code, err.message);
  //     setError("الإيميل أو كلمة المرور غلط");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const userData = await login(email, password);

      // حفظ في localStorage
      localStorage.setItem("uid", userData.uid);
      localStorage.setItem("role", userData.role);
      localStorage.setItem("name", userData.name);
      // توجيه حسب الدور
      
      if (userData.role === "admin") navigate("/admin")
       else if (userData.role === "supervisor" && userData.isDeleted === false ) navigate("/supervisor")
        else{
      setError("غير مصرح لك بالدخول");
       }
      
    } catch (err) {
      setError("بيانات غلط أو المستخدم مش موجود");
    } finally {
      setLoading(false);
    }
  };
  const handleResetPassword = async () => {
  try {
    await forgotPassword(resetEmail);

    setMessage(
      "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"
    );

    setShowReset(false);

  } catch (error) {

    if (error.code === "auth/user-not-found") {
      setError("لا يوجد مستخدم بهذا البريد");
    }

    else if (error.code === "auth/invalid-email") {
      setError("البريد الإلكتروني غير صالح");
    }

    else {
      setError("حدث خطأ أثناء إرسال الرسالة");
    }
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white px-6 py-4 rounded-xl shadow-md w-full max-w-md">
        <img src={logo} alt="Logo" className="mx-auto  h-32 " />
        <h2 className="text-2xl font-bold text-center mb-4">تسجيل الدخول</h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-center">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-1"> البريد الإلكتروني </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-2 text-right"
              placeholder="example@gmail.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-2 text-right"
              placeholder="••••••"
              required
            />
          </div>
          <div className="text-left">
          <button
            type="button"
            onClick={() => setShowReset(true)}
            className="text-sm text-green-600 hover:underline"
          >
            نسيت كلمة المرور؟
          </button>
        </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
        {showReset && (
  <div className="mt-4 border rounded-lg p-4 bg-gray-50">

    <p className="mb-2 text-sm">
      أدخل البريد الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور
    </p>

    <input
      type="email"
      value={resetEmail}
      onChange={(e) => setResetEmail(e.target.value)}
      className="w-full border rounded-lg p-2"
      placeholder="example@gmail.com"
    />

    <div className="flex gap-2 mt-3">

      <button
        onClick={handleResetPassword}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        إرسال
      </button>

      <button
        onClick={() => setShowReset(false)}
        className="border px-4 py-2 rounded"
      >
        إلغاء
      </button>

    </div>

  </div>
)}
      </div>
    </div>
  );
};

export default Login;
