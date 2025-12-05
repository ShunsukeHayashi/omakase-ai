import React from "react";
    import { Alert, Button, Checkbox, Divider, Input, Link } from "@heroui/react";
    import { Icon } from "@iconify/react";

    type FormState = {
      siteUrl: string;
      email: string;
      phone: string;
      countryCode: string;
      password: string;
      confirmPassword: string;
      agree: boolean;
    };

    const emailValid = (value: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

    const urlLooksValid = (value: string) => {
      if (!value) return false;
      try {
        const u = new URL(value);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    };

    export const LoginCard = () => {
      const [state, setState] = React.useState<FormState>({
        siteUrl: "",
        email: "",
        phone: "",
        countryCode: "+81",
        password: "",
        confirmPassword: "",
        agree: false,
      });

      const [alert, setAlert] = React.useState<{ type: "success" | "error"; title: string; desc?: string } | null>(null);
      const [loading, setLoading] = React.useState(false);

      const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setState((s) => ({ ...s, [key]: value }));
      };

      const validateAll = () => {
        if (!urlLooksValid(state.siteUrl)) {
          setAlert({
            type: "error",
            title: "GoogleサインインにはウェブサイトURLが必要です。",
            desc: "例: https://www.example.com",
          });
          return false;
        }
        if (!emailValid(state.email)) {
          setAlert({
            type: "error",
            title: "メールアドレスの形式が正しくありません。",
          });
          return false;
        }
        if (state.password.length < 8) {
          setAlert({
            type: "error",
            title: "パスワードは8文字以上で入力してください。",
          });
          return false;
        }
        if (state.password !== state.confirmPassword) {
          setAlert({
            type: "error",
            title: "パスワードが一致しません。",
          });
          return false;
        }
        if (!state.agree) {
          setAlert({
            type: "error",
            title: "利用規約に同意してください。",
          });
          return false;
        }
        return true;
      };

      const handleGoogle = () => {
        if (!urlLooksValid(state.siteUrl)) {
          setAlert({
            type: "error",
            title: "GoogleサインインにはウェブサイトURLが必要です。",
            desc: "プロトコルを含めて入力してください（https://）。",
          });
          return;
        }
        setAlert({
          type: "success",
          title: "Googleにリダイレクトします…",
          desc: "デモ挙動です。実際のOAuth連携は未実装です。",
        });
      };

      const handleSubmit = async () => {
        if (!validateAll()) return;
        setLoading(true);
        await new Promise((r) => setTimeout(r, 900));
        setLoading(false);
        setAlert({
          type: "success",
          title: "アカウントを作成しました。",
          desc: "ダッシュボードに移動します。",
        });
      };

      const siteInvalid = state.siteUrl !== "" && !urlLooksValid(state.siteUrl);
      const emailInvalid = state.email !== "" && !emailValid(state.email);
      const pwInvalid = state.password !== "" && state.password.length < 8;
      const confirmInvalid = state.confirmPassword !== "" && state.confirmPassword !== state.password;

      return (
        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-[1px] rounded-2xl bg-[conic-gradient(from_120deg,_rgba(168,85,247,0.3),_rgba(34,211,238,0.3),_rgba(168,85,247,0.3))] opacity-70 blur-[18px]"></div>

          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">サインアップ</h2>
              <div className="rounded-full border border-white/10 px-3 py-1 text-tiny text-foreground-400">
                Beta
              </div>
            </div>

            {alert && (
              <div className="mb-4">
                <Alert
                  title={alert.title}
                  description={alert.desc}
                  onClose={() => setAlert(null)}
                  onVisibleChange={() => {}}
                />
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="WebサイトURL"
                placeholder="例: https://www.example.com"
                value={state.siteUrl}
                onValueChange={(v) => setField("siteUrl", v)}
                isRequired
                isInvalid={siteInvalid}
                type="url"
              />
              {siteInvalid && (
                <p className="text-tiny text-danger-500">有効なURLを入力してください（https:// を含む）。</p>
              )}

              <Button
                fullWidth
                variant="flat"
                className="h-11 justify-center gap-2 rounded-medium bg-white/10 text-white transition-all duration-200 ease-out hover:bg-white/15"
                onPress={handleGoogle}
              >
                <Icon icon="logos:google-icon" className="text-xl" />
                Googleで続行
              </Button>

              <div className="flex items-center gap-3 py-1">
                <div className="h-[1px] flex-1 bg-white/10"></div>
                <span className="text-tiny text-foreground-500">or</span>
                <div className="h-[1px] flex-1 bg-white/10"></div>
              </div>

              <Input
                label="導入したいサイトのURL"
                placeholder="https://your-site.example"
                value={state.siteUrl}
                onValueChange={(v) => setField("siteUrl", v)}
                type="url"
              />

              <Input
                label="メールアドレス"
                placeholder="メールアドレスを入力"
                value={state.email}
                onValueChange={(v) => setField("email", v)}
                type="email"
                isInvalid={emailInvalid}
                isRequired
              />
              {emailInvalid && (
                <p className="text-tiny text-danger-500">メールアドレスの形式が正しくありません。</p>
              )}

              <div className="grid grid-cols-[100px_1fr] gap-3">
                <Input
                  label="国番号"
                  placeholder="+81"
                  value={state.countryCode}
                  onValueChange={(v) => setField("countryCode", v)}
                  type="tel"
                />
                <Input
                  label="電話番号"
                  placeholder="電話番号を入力"
                  value={state.phone}
                  onValueChange={(v) => setField("phone", v)}
                  type="tel"
                />
              </div>

              <Input
                label="パスワード"
                placeholder="パスワードを入力（8文字以上）"
                value={state.password}
                onValueChange={(v) => setField("password", v)}
                type="password"
                isInvalid={pwInvalid}
                isRequired
              />
              {pwInvalid && (
                <p className="text-tiny text-danger-500">パスワードは8文字以上で入力してください。</p>
              )}

              <Input
                label="パスワード（再入力）"
                placeholder="もう一度パスワードを入力"
                value={state.confirmPassword}
                onValueChange={(v) => setField("confirmPassword", v)}
                type="password"
                isInvalid={confirmInvalid}
                isRequired
              />
              {confirmInvalid && (
                <p className="text-tiny text-danger-500">パスワードが一致しません。</p>
              )}

              <div className="flex items-center justify-between">
                <Checkbox
                  isSelected={state.agree}
                  onValueChange={(v) => setField("agree", v)}
                >
                  利用規約に同意します
                </Checkbox>
                <Link
                  href="#"
                  className="text-tiny text-foreground-500 underline decoration-white/20 underline-offset-4 transition-all hover:text-foreground-400"
                >
                  規約を見る
                </Link>
              </div>

              <Button
                color="primary"
                fullWidth
                className="h-11 rounded-medium transition-all duration-200 ease-out hover:translate-y-[-1px]"
                isLoading={loading}
                onPress={handleSubmit}
              >
                アカウントを作成
              </Button>

              <div className="pt-2 text-center text-small text-foreground-500">
                既にアカウントをお持ちですか？{" "}
                <Link href="#" className="text-primary">
                  ログイン
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    };