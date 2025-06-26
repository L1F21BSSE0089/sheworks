export default function Contact() {
  return (
    <div className="px-4 md:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Contact</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="bg-secondary rounded-lg p-8 w-full md:w-1/3 mb-6 md:mb-0">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <span className="text-2xl">📞</span> Call To Us
            </div>
            <div>We are available 24/7, 7 days a week.</div>
            <div className="font-bold mt-2">Phone: 03104687705</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <span className="text-2xl">✉️</span> Write To US
            </div>
            <div>Fill out our form and we will contact you within 24 hours.</div>
            <div className="font-bold mt-2">Emails: customer@exclusive.com</div>
            <div className="font-bold">support@exclusive.com</div>
          </div>
        </div>
        <form className="flex-1 bg-white rounded-lg shadow p-4 md:p-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input className="bg-gray-100 p-2 rounded w-full" placeholder="Your Name *" />
            <input className="bg-gray-100 p-2 rounded w-full" placeholder="Your Email *" />
            <input className="bg-gray-100 p-2 rounded w-full" placeholder="Your Phone *" />
          </div>
          <textarea className="bg-gray-100 p-2 rounded w-full h-32" placeholder="Your Message" />
          <button className="bg-primary text-white px-8 py-2 rounded w-full md:w-auto">Send Message</button>
        </form>
      </div>
    </div>
  );
}