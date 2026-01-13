**Redeploy & View Logs (Step-by-Step)**

**১. Redeploy (রানিং জব ফেলে দিয়ে নতুন করে শুরু করা):**
নিচের কমান্ডটি রান করুন। এটি পুরনো জব ডিলিট করে, নতুন ইমেজ বিল্ড করে এবং আবার সব চালু করবে।

```bash
sh deploy-do.sh
```


**৩. Kubernetes Logs দেখার নিয়ম:**

*   **সব পডের অবস্থা দেখতে:**
    ```bash
    kubectl get pods -l app=eazyslot -w
    ```

*   **যেকোনো একটি পডের লাইভ লগ দেখতে:**
    (প্রথমে উপরের কমান্ড দিয়ে পডের নাম কপি করুন, যেমন `eazyslot-batch-xxxxx`)
    ```bash
    kubectl logs eazyslot-batch-14-x8fgx -f
    ```

*   **সব পডের লগ একসাথে দেখতে (Best Way):**
    যদি `stern` ইনস্টল করা থাকে:
    ```bash
    stern eazyslot
    ```
    না থাকলে:
    ```bash
    kubectl logs -l app=eazyslot -f --max-log-requests=10
    ```

*   **ড্যাশবোর্ড (ব্রাউজারে):**
    আইপি পেতে: `kubectl get svc eazyslot-dashboard-svc`
    তারপর ব্রাউজারে: `http://<EXTERNAL-IP>/dashboard`

আপনি এখন `sh deploy-do.sh` চালিয়ে দিন, তারপর লগ দেখা শুরু করুন।