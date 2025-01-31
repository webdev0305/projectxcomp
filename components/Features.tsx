import Image from "next/image"; // Images

export default function Features() {
  return (
    <section className="pt-120 pb-120">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 order-lg-1 order-2">
              <div className="row mb-none-30">
                <div className="col-lg-6 mb-30">
                  <div className="row mb-none-30">
                    <div
                      className="col-lg-12 col-md-6 mb-30 wow fadeInUp"
                      data-wow-duration="0.5s"
                      data-wow-delay="0.3s"
                    >
                      <div className="feature-card hover--effect-1">
                        <div className="feature-card__icon">
                          <img
                            src="assets/images/icon/feature/1.png"
                            alt="image"
                          />
                        </div>
                        <div className="feature-card__content">
                          <h3 className="feature-title">Anonymity</h3>
                          <p>
                            No need to register, just connect your wallet and play!
                          </p>
                        </div>
                      </div>
                      {/* <!-- feature-card end --> */}
                    </div>
                    {/* <!-- feature-card end --> */}
                    <div
                      className="col-lg-12 col-md-6 mb-30 wow fadeInUp"
                      data-wow-duration="0.5s"
                      data-wow-delay="0.5s"
                    >
                      <div className="feature-card hover--effect-1">
                        <div className="feature-card__icon">
                          <img
                            src="assets/images/icon/feature/3.png"
                            alt="image"
                          />
                        </div>
                        <div className="feature-card__content">
                          <h3 className="feature-title">True Random</h3>
                          <p>
                          	Utilising Chainlink VRF service for ultimate fairness
                          </p>
                        </div>
                      </div>
                      {/* <!-- feature-card end --> */}
                    </div>
                    {/* <!-- feature-card end --> */}
                  </div>
                </div>
                <div className="col-lg-6 mb-30 mt-lg-5">
                  <div className="row mb-none-30">
                    <div
                      className="col-lg-12 col-md-6 mb-30 wow fadeInUp"
                      data-wow-duration="0.5s"
                      data-wow-delay="0.3s"
                    >
                      <div className="feature-card hover--effect-1">
                        <div className="feature-card__icon">
                          <img
                            src="assets/images/icon/feature/2.png"
                            alt="image"
                          />
                        </div>
                        <div className="feature-card__content">
                          <h3 className="feature-title">Security</h3>
                          <p>
                            Ultimate auditing from the Avalanche blockchain
                          </p>
                        </div>
                      </div>
                      {/* <!-- feature-card end --> */}
                    </div>
                    {/* <!-- feature-card end --> */}
                  </div>
                </div>
              </div>
            </div>
            <div
              className="col-lg-6 order-lg-2 order-1 text-lg-left text-center wow fadeInRight"
              data-wow-duration="0.5s"
              data-wow-delay="0.5s"
            >
              <div className="section-header">
                <h2 className="section-title">Our features</h2>
                <p>
                  We have strived to make competitionX revolutionary in the competition space by utilising the latest in blockchain technology.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}
