export default function About() {
  return (
    <div className="px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Our Story</h1>
          <p className="mb-4">
            At SheWorks, we believe in empowering female entrepreneurs to showcase and sell their handmade products to the world.
            Founded with the mission of breaking down cultural, language, and technical barriers, SheWorks provides a platform that makes it easier for women to start, manage, and grow their online businesses.
          </p>
          <p className="mb-4">
            Our team is committed to creating a seamless and inclusive e-commerce experience by offering features such as multilingual support, AI-driven product recommendations, real-time chat translation, and secure payment processing. These tools help women focus on what they do best—creating beautiful products—while we take care of the technology.
          </p>
          <p className="mb-4">
            Our vision is to provide a platform that not only supports entrepreneurship but also builds a community of women who can connect, collaborate, and thrive together. We are constantly working to expand our reach, improve our platform, and introduce new features that will help female entrepreneurs grow their businesses with confidence and ease.
          </p>
          <p>
            SheWorks is more than just a marketplace—it's a space where creativity meets opportunity, and where women can turn their passion into a thriving business.
          </p>
        </div>
        <img
          src="/shop.webp"
          alt="Our Story"
          className="w-full md:w-1/2 rounded-lg object-cover mt-6 md:mt-0"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-12 justify-center">
        <div className="bg-secondary rounded-lg p-8 text-center">
          <div className="text-3xl font-bold text-primary mb-2">10.5k</div>
          <div>Sellers active our site</div>
        </div>
        <div className="bg-primary rounded-lg p-8 text-center text-white">
          <div className="text-3xl font-bold mb-2">33k</div>
          <div>Monthly Product Sale</div>
        </div>
        <div className="bg-secondary rounded-lg p-8 text-center">
          <div className="text-3xl font-bold text-primary mb-2">45.5k</div>
          <div>Customer active in our site</div>
        </div>
        <div className="bg-secondary rounded-lg p-8 text-center">
          <div className="text-3xl font-bold text-primary mb-2">25k</div>
          <div>Annual gross sale in our site</div>
        </div>
      </div>
    </div>
  );
}